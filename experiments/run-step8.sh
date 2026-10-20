#!/usr/bin/env bash
# Проверка критериев этапа 5 (шаг 8): описания из experiments/prompts.json × режимы через задеплоенную
# функцию generate-site. Ответы — в experiments/results/<дата-время>[_модель]/ (папка в .gitignore).
#
# Токен (access_token из приложения: DevTools → Application → Local Storage → sb-…-auth-token):
#   из переменной окружения TOKEN, а если её нет — из буфера обмена (pbpaste).
#   Токен не печатается и не попадает в командную строку curl (заголовок передаётся через --config -).
#
# Запуск из корня репозитория:
#   ./experiments/run-step8.sh                 # все описания, режимы markdown и json
#   MODES=markdown ./experiments/run-step8.sh  # только markdown
#   MODEL=GigaChat-2-Max ./experiments/run-step8.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROMPTS="$ROOT/experiments/prompts.json"
# GENERATE_URL — подменить адрес функции (например, на локальную заглушку при проверке скрипта)
URL="${GENERATE_URL:-https://tscyshpimbgoelliqhxu.supabase.co/functions/v1/generate-site}"
MODES="${MODES:-markdown json}"
MODEL="${MODEL:-}"

fail() { echo "Ошибка: $1" >&2; exit 1; }

command -v python3 >/dev/null || fail "нужен python3 (есть в macOS: xcode-select --install)"

# --- токен: TOKEN или буфер; убираем пробелы, переводы строк и служебные символы вставки (ESC[200~ … ESC[201~)
raw="${TOKEN:-}"
source_name="переменной TOKEN"
if [ -z "$raw" ]; then
  command -v pbpaste >/dev/null || fail "TOKEN не задан, а буфер обмена недоступен (pbpaste есть только в macOS)"
  raw="$(pbpaste)"
  source_name="буфера обмена"
fi
token="$(printf '%s' "$raw" | LC_ALL=C tr -d '\000-\040\177' | sed -e 's/\[20[01]~//g')"
unset raw TOKEN

if [[ ! "$token" =~ ^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$ ]]; then
  fail "в $source_name нет токена: он должен начинаться с eyJ и состоять из трёх частей через точку.
Скопируйте значение access_token (без кавычек) из DevTools → Application → Local Storage → sb-tscyshpimbgoelliqhxu-auth-token
и запустите снова. Или передайте его так: TOKEN=\"\$(pbpaste)\" ./experiments/run-step8.sh"
fi

# Срок действия — из поля exp токена (без проверки подписи: это делает сервер)
expires_in="$(printf '%s' "$token" | python3 -c '
import base64, json, sys, time
part = sys.stdin.read().split(".")[1]
payload = json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
print(int(payload.get("exp", 0) - time.time()))
' 2>/dev/null)" || fail "токен не разобрался — скопируйте access_token заново"
[ "$expires_in" -gt 60 ] || fail "токен истёк. Обновите страницу приложения, скопируйте access_token заново и запустите снова"
[ "$expires_in" -gt 900 ] || echo "Внимание: токен истечёт через $((expires_in / 60)) мин — прогон может не успеть" >&2

# --- прогон
# Модель — в имени папки: прогоны на разных моделях не смешиваются
OUT="$ROOT/experiments/results/$(date +%Y-%m-%d_%H-%M-%S)${MODEL:+_$MODEL}"
mkdir -p "$OUT"
ids="$(python3 -c 'import json, sys; [print(d["id"]) for d in json.load(open(sys.argv[1]))]' "$PROMPTS")"
printf 'id\tmode\thttp\tseconds\toutcome\tattempts\trun_id\n' > "$OUT/summary.tsv"

for mode in $MODES; do
  for id in $ids; do
    # В функцию уходят только поля запроса: description, business, mode, model (tags и check — для человека)
    body="$(python3 -c '
import json, sys
rows = {d["id"]: d for d in json.load(open(sys.argv[1]))}
d = rows[sys.argv[2]]
req = {"description": d["description"], "mode": sys.argv[3]}
if d.get("business"): req["business"] = d["business"]
if sys.argv[4]: req["model"] = sys.argv[4]
print(json.dumps(req, ensure_ascii=False))
' "$PROMPTS" "$id" "$mode" "$MODEL")"
    result="$OUT/$id-$mode.json"
    start=$(date +%s)
    code="$(printf 'header = "Authorization: Bearer %s"\n' "$token" | curl -s --config - -o "$result" -w '%{http_code}' \
      -X POST "$URL" -H 'Content-Type: application/json' --max-time 170 --data-binary "$body" || true)"
    code="${code:-000}"
    seconds=$(( $(date +%s) - start ))
    line="$(python3 -c '
import json, sys
try:
    r = json.load(open(sys.argv[1]))
except Exception:
    r = {}
print("\t".join(str(x) for x in [r.get("outcome") or r.get("error") or "нет ответа", r.get("attempts", ""), r.get("runId", "")]))
' "$result")"
    printf '%s\t%s\t%s\t%s\t%s\n' "$id" "$mode" "$code" "$seconds" "$line" >> "$OUT/summary.tsv"
    printf '%-16s %-9s HTTP %s  %3s с  %s\n' "$id" "$mode" "$code" "$seconds" "$(printf '%s' "$line" | cut -f1-2 | tr '\t' ' ')"
  done
done

unset token
echo "Готово. Ответы и summary.tsv — в ${OUT#"$ROOT"/}"
