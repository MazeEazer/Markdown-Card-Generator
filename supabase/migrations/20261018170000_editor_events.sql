-- События редактора для эксперимента (этап 7): показана/принята подсказка, ошибка появилась/исправлена.
-- Пишет браузер вошедшего пользователя; логирование включается флагом (VITE_EDITOR_EVENTS или localStorage).

CREATE TABLE public.editor_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Владелец события: заполняется сам из JWT, подменить нельзя (см. правило на вставку)
    user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Сайт, который редактировали; при удалении сайта события остаются для статистики
    site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
    -- Один открытый редактор (от открытия сайта до ухода) — чтобы считать события по сеансам
    session_id uuid NOT NULL,
    event text NOT NULL CHECK (event IN (
        'completion_shown',
        'completion_accepted',
        'hover_shown',
        'diagnostic_appeared',
        'diagnostic_resolved',
        'fix_applied',
        'block_inserted'
    )),
    -- Код правила валидатора, имя блока или подсказки — по чему группировать
    code text,
    -- Подробности: важность, источник исправления, число вариантов и т. п.
    detail jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Время на стороне браузера: события отправляются пачками, порядок важнее времени вставки
    occurred_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_editor_events_user_time ON public.editor_events USING btree (user_id, occurred_at);
CREATE INDEX idx_editor_events_session ON public.editor_events USING btree (session_id);

ALTER TABLE public.editor_events ENABLE ROW LEVEL SECURITY;

-- Вставлять — только свои события и только к своему сайту (или без сайта)
CREATE POLICY "Users can insert own editor events" ON public.editor_events
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND (site_id IS NULL OR EXISTS (
            SELECT 1 FROM public.sites WHERE sites.id = site_id AND sites.user_id = auth.uid()
        ))
    );

-- Читать — только свои. Изменять и удалять нельзя никому, кроме service role (анализ данных — через SQL Editor)
CREATE POLICY "Users can view own editor events" ON public.editor_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
