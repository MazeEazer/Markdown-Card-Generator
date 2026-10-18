-- Исправления безопасности, найденные при выгрузке базовой схемы (см. PLAN.md, этап 0, «Заметки для ВКР»).

-- 1. Правила Storage без ограничения bucket_id — дубли, созданные через панель.
--    Они разрешали загрузку, удаление и чтение «в своей папке» в ЛЮБОМ бакете, а не только в `sites`.
--    Для бакета `sites` те же действия уже покрыты правилами с проверкой bucket_id:
--    «Users can upload own sites», «Users can delete own sites», «Anyone can view sites».
DROP POLICY IF EXISTS "Users can delete own sites 1t5udo_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own sites 1t5udo_1" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own sites 1t5udo_0" ON storage.objects;

-- 2. Функция с SECURITY DEFINER выполняется с правами владельца. Без фиксированного search_path
--    вызывающий мог бы подложить свою таблицу `profiles` в схему, которая стоит раньше в пути поиска.
--    Тело функции обращается к public.profiles по полному имени, поэтому пустой путь ему не мешает.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
