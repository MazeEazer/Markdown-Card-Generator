-- Версии для анализа эксперимента 1: по журналу отбираются запуски с одинаковыми правилами.
--   prompt_version      (уже есть) — хеш промпта, ушедшего нейросети; с нишей он у каждой ниши свой.
--   prompt_base_version — хеш промпта того же режима без ниши: общий для всех запусков режима.
--   pipeline_version    — хеш отпечатка обработки ответа без нейросети (автоисправления, проверка по описанию,
--                         удаление пустых блоков, очистка JSON): pipelineFingerprint в src/dsl/generate.ts.
-- Считает Edge Function generate-site (первые 12 знаков SHA-256), ручных номеров нет.

ALTER TABLE public.generation_logs
    ADD COLUMN prompt_base_version text,
    ADD COLUMN pipeline_version text;

COMMENT ON COLUMN public.generation_logs.prompt_base_version IS 'SHA-256 (12 знаков) системного промпта этого режима без ниши';
COMMENT ON COLUMN public.generation_logs.pipeline_version IS 'SHA-256 (12 знаков) отпечатка обработки ответа (pipelineFingerprint)';

-- Старые запуски без ниши: промпт и был базовым. С нишей и версию обработки для них уже не восстановить — NULL
UPDATE public.generation_logs SET prompt_base_version = prompt_version WHERE business IS NULL;

-- Выборки эксперимента: «все запуски одной версии промпта и обработки»
CREATE INDEX idx_generation_logs_versions ON public.generation_logs USING btree (prompt_base_version, pipeline_version);
