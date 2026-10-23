-- Эксперимент 1 (этап 7): что на самом деле ответило и сколько стоило.
--   response_model          — имя модели из ответа GigaChat (поле model): проверка, что ответила запрошенная модель,
--                             а не другая (у GigaChat-3-Ultra в пробном прогоне ответы за ~3 с).
--   precached_prompt_tokens — входные токены, взятые из кэша промпта (usage.precached_prompt_tokens): в tokens_in
--                             они не входят, поэтому без них стоимость моделей несравнима (у Lightning tokens_in ~120).
-- Заполняются только в строках stage = 'model'; у старых запусков — NULL. Политики RLS прежние (таблица та же).

ALTER TABLE public.generation_logs
    ADD COLUMN response_model text,
    ADD COLUMN precached_prompt_tokens integer;

COMMENT ON COLUMN public.generation_logs.response_model IS 'Имя модели из ответа GigaChat (только stage = model)';
COMMENT ON COLUMN public.generation_logs.precached_prompt_tokens IS 'Входные токены из кэша промпта, не входят в tokens_in (только stage = model)';
