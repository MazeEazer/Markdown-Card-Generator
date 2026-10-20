-- Журнал AI-генерации (этап 5) — измерительные данные эксперимента 1 (этап 7).
-- Одна строка — один этап одного обращения к нейросети:
--   stage = 'model'   — ответ нейросети как есть и замечания к нему (до автоисправлений);
--   stage = 'autofix' — документ после автоисправлений валидатора (только если ответ стал документом).
-- Пишет только Edge Function с service role: пользователь не может ни подделать, ни удалить записи.

CREATE TABLE public.generation_logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Один запуск генерации: все обращения к нейросети и их этапы
    run_id uuid NOT NULL,
    -- Владелец; пишет функция с service role, поэтому без DEFAULT auth.uid() — задаётся явно из JWT
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Сайт, к которому относится запуск (для fix — обязательно, для generate — если уже создан)
    site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
    -- generate — сайт по описанию; fix — «Объяснить и исправить» (шаг 7, позже)
    kind text NOT NULL CHECK (kind IN ('generate', 'fix')),
    mode text NOT NULL CHECK (mode IN ('markdown', 'json')),
    model text NOT NULL,
    business text,
    -- Описание пользователя (исходный запрос запуска)
    prompt text NOT NULL,
    -- Версия системного промпта: первые 12 знаков SHA-256 его текста в этом режиме (меняется вместе со схемой)
    prompt_version text NOT NULL,
    attempt integer NOT NULL CHECK (attempt >= 1),
    stage text NOT NULL CHECK (stage IN ('model', 'autofix')),
    -- Сообщение пользователя этой попытки: описание или просьба исправить (системный промпт — из кода)
    request text NOT NULL,
    -- false — запрос до нейросети не дошёл (занято, 429): такой запуск не расходует лимит
    reached_model boolean NOT NULL,
    -- model — ответ нейросети; autofix — документ после автоисправлений; NULL — ответа нет
    output text,
    -- Замечания валидатора (или ошибки разбора JSON: коды json-syntax, json-schema)
    diagnostics jsonb NOT NULL DEFAULT '[]'::jsonb,
    errors_count integer NOT NULL DEFAULT 0,
    -- Все предупреждения (severity = warning), включая «нехватку данных»
    warnings_count integer NOT NULL DEFAULT 0,
    -- Замечания «нехватки данных» любой важности (src/dsl/codes.ts, MISSING_DATA_CODES)
    missing_data_count integer NOT NULL DEFAULT 0,
    -- Коды применённых автоисправлений (только stage = autofix)
    fixed_codes text[] NOT NULL DEFAULT '{}',
    -- Ответ GigaChat: stop, length, blacklist…
    finish_reason text,
    -- Почему нет ответа: ошибка сети, таймаут, занято
    error text,
    -- Что реально ушло в нейросеть: temperature, maxTokens
    params jsonb NOT NULL,
    tokens_in integer,
    tokens_out integer,
    latency_ms integer,
    -- Чем закончился запуск (valid, no-progress, deadline, blacklist…) — одинаково во всех строках запуска
    outcome text NOT NULL,
    -- Итог запуска — ровно одна строка на запуск (правило — logRows в src/dsl/generate.ts, закреплено тестом):
    -- autofix-строка лучшей попытки; если документа не дала ни одна — model-строка последней попытки.
    -- Так неудачные запуски (blacklist, битый JSON, length) остаются в выборке эксперимента
    is_final boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE (run_id, attempt, stage),
    CHECK (stage = 'model' OR reached_model)
);

-- Лимит в сутки и выборки по пользователю
CREATE INDEX idx_generation_logs_user_time ON public.generation_logs USING btree (user_id, created_at);
CREATE INDEX idx_generation_logs_run ON public.generation_logs USING btree (run_id);
CREATE UNIQUE INDEX idx_generation_logs_one_final ON public.generation_logs USING btree (run_id) WHERE is_final;

ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

-- Читать — только свои строки. Правил на вставку, изменение и удаление нет: при включённом RLS это запрет
-- для anon и authenticated; service role (Edge Function) обходит RLS
CREATE POLICY "Users can view own generation logs" ON public.generation_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Вторая линия защиты: даже если кто-то по ошибке добавит разрешающую политику
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.generation_logs FROM anon, authenticated;
