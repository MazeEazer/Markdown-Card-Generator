"""Эксперимент 1: итоговые таблицы и графики для главы 4.

Читает:
  experiments/results/exp1/final.csv, metrics.csv — выгрузка export-logs.ts (в .gitignore,
      пересобирается командой `node experiments/export-logs.ts`);
  experiments/annotation-exp1-sheet.csv — ручная разметка 160 сайтов (в git).
Пишет:
  experiments/figures/exp1-tables.md — таблицы (их копия — в analysis-exp1.md);
  experiments/figures/exp1-*.png — графики (подписи по-русски, читаются в ч/б: оттенки серого + штриховка).

Запуск (macOS):
  python3 -m venv ~/.venvs/mdcard && ~/.venvs/mdcard/bin/pip install matplotlib
  ~/.venvs/mdcard/bin/python experiments/figures/exp1_report.py
"""

import csv
import statistics
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / "experiments/results/exp1"
OUT = ROOT / "experiments/figures"
SHEET = ROOT / "experiments/annotation-exp1-sheet.csv"

MODELS = ["GigaChat-2-Pro", "GigaChat-2-Max", "GigaChat-3-Lightning", "GigaChat-3-Pro", "GigaChat-3-Ultra"]
SHORT = {m: m.replace("GigaChat-", "") for m in MODELS}
MODES = ["markdown", "json"]
FOREIGN = {"t06-foreign-phone", "n09-foreign-currency", "p08-english-foreign"}
TAGS_SKIP = ("niche:", "author:")


def read(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def pct(a, b):
    return f"{100 * a / b:.1f}".replace(".", ",") + " %" if b else "—"


def num(x, d=1):
    return f"{x:.{d}f}".replace(".", ",")


def p90(xs):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(0.9 * (len(xs) - 1))))]


final = read(RES / "final.csv")
metrics = {(r["model"], r["mode"]): r for r in read(RES / "metrics.csv")}
sheet = read(SHEET)
b = lambda r, k: r[k] in ("1", "true", "True")  # noqa: E731

lines = ["# Эксперимент 1 — таблицы (сгенерировано exp1_report.py)", ""]
md = lines.append


def table(head, rows):
    md("| " + " | ".join(head) + " |")
    md("|" + "---|" * len(head))
    for r in rows:
        md("| " + " | ".join(str(c) for c in r) + " |")
    md("")


# --- 1. Каскад валидности -------------------------------------------------------
def cascade(rows):
    n = len(rows)
    first = sum(b(r, "first_model_valid") for r in rows)
    auto = sum(b(r, "rescued_by_autofix") for r in rows)
    model = sum(b(r, "repaired_by_model") for r in rows)
    valid = sum(b(r, "valid") for r in rows)
    assert first + auto + model == valid, "каскад не сходится"
    return n, first, auto, model, valid


md("## Каскад валидности (оба повтора, n = 96 на строку)")
md("")
rows, casc = [], {}
for m in MODELS:
    for mode in MODES:
        sub = [r for r in final if r["model"] == m and r["mode"] == mode]
        n, f, a, rm, v = cascade(sub)
        nf = [r for r in sub if r["id"] not in FOREIGN]
        casc[(m, mode)] = (n, f, a, rm, v)
        rows.append([SHORT[m], mode, f, a, rm, f"**{v}** ({pct(v, n)})", n - v,
                     f"{sum(b(r, 'valid') for r in nf)} / {len(nf)} ({pct(sum(b(r, 'valid') for r in nf), len(nf))})"])
for mode in MODES:
    sub = [r for r in final if r["mode"] == mode]
    n, f, a, rm, v = cascade(sub)
    nf = [r for r in sub if r["id"] not in FOREIGN]
    vnf = sum(b(r, "valid") for r in nf)
    rows.append([f"**Все**", mode, f"{f} ({pct(f, n)})", a, rm, f"**{v}** ({pct(v, n)})", n - v,
                 f"{vnf} / {len(nf)} ({pct(vnf, len(nf))})"])
table(["Модель", "Режим", "Сразу", "+ автоиспр.", "+ исправл. моделью", "Итого валидных", "Не валиден",
       "Итог без t06, n09, p08"], rows)

# --- 2. Попытки, токены, время ---------------------------------------------------
md("## Попытки, токены, время (оба повтора)")
md("")
rows = []
for m in MODELS:
    for mode in MODES:
        x = metrics[(m, mode)]
        tin, tpc = float(x["tokens_in_mean"]), float(x["tokens_precached_mean"])
        full = tin + tpc
        rows.append([SHORT[m], mode, num(float(x["attempts_mean"]), 2), f"{full:,.0f}".replace(",", " "),
                     f"{tpc:,.0f}".replace(",", " ") + f" ({100 * tpc / full:.0f} %)", x["tokens_out_mean"],
                     f"{num(float(x['seconds_median']))} / {num(float(x['seconds_p90']))}", x["tech_failures"]])
table(["Модель", "Режим", "Попыток", "Вход всего", "из них кэш", "Выход", "Время: медиана / p90, с",
       "Тех. сбоев"], rows)

# --- 3. Стабильность повторов ---------------------------------------------------
md("## Стабильность повторов 1↔2 (48 пар на строку)")
md("")
by = defaultdict(dict)
for r in final:
    by[(r["model"], r["mode"], r["id"])][r["rep"]] = r
rows = []
tot_same = tot = 0
for m in MODELS:
    for mode in MODES:
        pairs = [v for k, v in by.items() if k[0] == m and k[1] == mode and len(v) == 2]
        same = sum(b(p["1"], "valid") == b(p["2"], "valid") for p in pairs)
        raw = sum(b(p["1"], "first_model_valid") != b(p["2"], "first_model_valid") for p in pairs)
        tot_same += same
        tot += len(pairs)
        x = metrics[(m, mode)]
        rows.append([SHORT[m], mode, f"{same} / {len(pairs)}", raw, num(float(x["repeat_identical_doc"]) * 100, 0) + " %",
                     num(float(x["repeat_line_jaccard"]), 2)])
table(["Модель", "Режим", "Итог валидности совпал", "«Сразу» разошлось", "Одинаковый документ",
       "Сходство строк (Жаккар)"], rows)
md(f"Всего: итоговая валидность совпала в {tot_same} из {tot} пар.")
md("")

# --- 4. Трудные теги ------------------------------------------------------------
md("## Трудные теги (все модели, оба повтора)")
md("")
tagrows = defaultdict(list)
for r in final:
    for t in r["tags"].split(";") if ";" in r["tags"] else r["tags"].split("|") if "|" in r["tags"] else r["tags"].split():
        if t and not t.startswith(TAGS_SKIP):
            tagrows[(t, r["mode"])].append(r)
hard = []
for (t, mode), rs in tagrows.items():
    n = len(rs)
    hard.append((t, mode, n, sum(b(r, "first_model_valid") for r in rs) / n, sum(b(r, "valid") for r in rs) / n,
                 statistics.mean(int(r["attempts"]) for r in rs)))
tags = sorted({h[0] for h in hard}, key=lambda t: min(h[3] for h in hard if h[0] == t))
rows = []
for t in tags:
    md_ = next(h for h in hard if h[0] == t and h[1] == "markdown")
    js_ = next(h for h in hard if h[0] == t and h[1] == "json")
    rows.append([t, md_[2], pct(md_[3], 1), num(md_[5], 2), pct(js_[3], 1), pct(js_[4], 1), num(js_[5], 2)])
table(["Тег", "n в режиме", "md: сразу", "md: попыток", "json: сразу", "json: итог", "json: попыток"], rows)

# --- 5. Ручная разметка ---------------------------------------------------------
I = lambda r, k: int(r[k] or 0)  # noqa: E731


def ann(rs):
    sites = [r for r in rs if r["completeness_1_5"]]
    return dict(
        n=len(rs), nosite=len(rs) - len(sites),
        inv=sum(I(r, "invented_model") for r in rs), reached=sum(I(r, "invented_reached") for r in rs),
        sites_reached=sum(I(r, "invented_reached") > 0 for r in rs),
        mis=sum(I(r, "misleading") for r in rs), mis_s=sum(I(r, "misleading_schema") for r in rs),
        sites_mis=sum(I(r, "misleading") - I(r, "misleading_schema") > 0 for r in rs),
        inacc=sum(I(r, "inaccurate") for r in rs), fd=sum(I(r, "false_deletions") for r in rs),
        rv=sum(I(r, "rule_violations") for r in rs),
        compl=statistics.mean(int(r["completeness_1_5"]) for r in sites) if sites else 0,
    )


AH = ["Выдумано (в ответе)", "Дошло", "Отсечено обработкой", "Сайтов с выдумкой", "Вводит в заблуждение (из них схема)",
      "Неточно", "Ложные удаления", "Нарушения правил", "Полнота (1–5)", "Нет сайта"]


def arow(a):
    cut = a["inv"] - a["reached"]
    return [a["inv"], a["reached"], f"{cut} ({pct(cut, a['inv'])})", f"{a['sites_reached']} / {a['n']}",
            f"{a['mis']} ({a['mis_s']})", a["inacc"], a["fd"], a["rv"], num(a["compl"], 2), a["nosite"]]


annot = {}
for label, rs_all in [("все 16 описаний", sheet), ("без t06 (15 описаний)", [r for r in sheet if r["id"] not in FOREIGN])]:
    md(f"## Ручная разметка — {label}")
    md("")
    md("По моделям (оба режима):")
    md("")
    table(["Модель"] + AH, [[SHORT[m]] + arow(ann([r for r in rs_all if r["model"] == m])) for m in MODELS])
    md("По режимам:")
    md("")
    table(["Режим"] + AH, [[mode] + arow(ann([r for r in rs_all if r["mode"] == mode])) for mode in MODES]
          + [["**Все**"] + arow(ann(rs_all))])
    md("Модель × режим:")
    md("")
    table(["Модель", "Режим"] + AH,
          [[SHORT[m], mode] + arow(ann([r for r in rs_all if r["model"] == m and r["mode"] == mode]))
           for m in MODELS for mode in MODES])
    annot[label] = rs_all

checked = [r for r in sheet if r["author_check"].strip()]
md(f"Строк с заполненным author_check: {len(checked)} из {len(sheet)}.")
md("")
(OUT / "exp1-tables.md").write_text("\n".join(lines), encoding="utf-8")

# --- Графики --------------------------------------------------------------------
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": "#444", "axes.grid": True, "grid.color": "#ddd", "grid.linewidth": 0.6,
    "axes.axisbelow": True, "savefig.dpi": 200, "savefig.bbox": "tight", "hatch.linewidth": 0.7,
})
# Ч/б: ступени серого + штриховка, чтобы ряды различались при печати.
FILLS = [("#303030", ""), ("#8a8a8a", "///"), ("#d0d0d0", "..."), ("#ffffff", "xx")]
EDGE = "#222"
labels = [f"{SHORT[m]}\n{mode}" for m in MODELS for mode in MODES]

# 1. Каскад валидности
fig, ax = plt.subplots(figsize=(10, 4.6))
x = range(len(labels))
parts = [("Сразу (ответ модели)", 1), ("+ автоисправления", 2), ("+ исправление моделью", 3), ("Не валиден", None)]
bottom = [0] * len(labels)
for (name, idx), (fc, h) in zip(parts, FILLS):
    vals = []
    for m in MODELS:
        for mode in MODES:
            n, f, a, rm, v = casc[(m, mode)]
            vals.append(100 * ((f, a, rm)[idx - 1] if idx else n - v) / n)
    ax.bar(x, vals, bottom=bottom, color=fc, hatch=h, edgecolor=EDGE, linewidth=0.6, width=0.7, label=name)
    bottom = [b_ + v for b_, v in zip(bottom, vals)]
for i, (m, mode) in enumerate((m, mode) for m in MODELS for mode in MODES):
    n, f, a, rm, v = casc[(m, mode)]
    ax.text(i, 101.5, f"{100 * v / n:.0f} %".replace(".", ","), ha="center", va="bottom", fontsize=8.5)
ax.set_xticks(list(x), labels, fontsize=8.5)
ax.set_ylim(0, 112)
ax.set_ylabel("Доля запусков, %")
ax.set_title("Каскад валидности по моделям и режимам (960 запусков, 96 на столбец)", fontsize=11)
ax.legend(ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.17), frameon=False, fontsize=9)
ax.grid(axis="x", visible=False)
fig.savefig(OUT / "exp1-validity-cascade.png")
plt.close(fig)

# 2. Выдумано vs дошло
fig, ax = plt.subplots(figsize=(10, 4.4))
w = 0.38
inv = [ann([r for r in sheet if r["model"] == m and r["mode"] == mode])["inv"] for m in MODELS for mode in MODES]
rea = [ann([r for r in sheet if r["model"] == m and r["mode"] == mode])["reached"] for m in MODELS for mode in MODES]
xs = list(range(len(labels)))
ax.bar([i - w / 2 for i in xs], inv, w, color=FILLS[2][0], hatch=FILLS[2][1], edgecolor=EDGE, linewidth=0.6,
       label="Выдумано в ответе модели")
ax.bar([i + w / 2 for i in xs], rea, w, color=FILLS[0][0], edgecolor=EDGE, linewidth=0.6,
       label="Дошло до сайта после обработки")
for i, (a_, r_) in enumerate(zip(inv, rea)):
    ax.text(i - w / 2, a_ + 0.6, str(a_), ha="center", fontsize=8)
    ax.text(i + w / 2, r_ + 0.6, str(r_), ha="center", fontsize=8)
ax.set_xticks(xs, labels, fontsize=8.5)
ax.set_ylabel("Выдуманных фактов, шт.")
ax.set_title("Выдуманные факты: в ответе модели и на сайте (ручная разметка, 16 описаний × 10 условий)",
             fontsize=11)
ax.legend(frameon=False, fontsize=9)
ax.grid(axis="x", visible=False)
fig.savefig(OUT / "exp1-invented-vs-reached.png")
plt.close(fig)

# 3. Время по моделям
fig, ax = plt.subplots(figsize=(9, 4.4))
data, pos, lab = [], [], []
for i, m in enumerate(MODELS):
    for j, mode in enumerate(MODES):
        data.append([float(r["seconds"]) for r in final if r["model"] == m and r["mode"] == mode])
        pos.append(i * 2.6 + j)
bp = ax.boxplot(data, positions=pos, widths=0.75, patch_artist=True, showfliers=True, whis=(10, 90),
                medianprops=dict(color="#000", linewidth=1.6), flierprops=dict(marker="o", markersize=3,
                                                                             markerfacecolor="#888",
                                                                             markeredgecolor="#888"))
for k, patch in enumerate(bp["boxes"]):
    fc, h = (FILLS[3] if k % 2 == 0 else FILLS[1])
    patch.set(facecolor=fc, hatch=h, edgecolor=EDGE, linewidth=0.8)
ax.set_xticks([i * 2.6 + 0.5 for i in range(len(MODELS))], [SHORT[m] for m in MODELS])
ax.set_ylabel("Время запуска, с (все попытки и обработка)")
ax.set_title("Время генерации по моделям (оба повтора; усы — 10-й и 90-й процентили)", fontsize=11)
from matplotlib.patches import Patch  # noqa: E402

ax.legend(handles=[Patch(facecolor=FILLS[3][0], hatch=FILLS[3][1], edgecolor=EDGE, label="markdown"),
                   Patch(facecolor=FILLS[1][0], hatch=FILLS[1][1], edgecolor=EDGE, label="json")],
          frameon=False, fontsize=9)
ax.set_ylim(0, None)
ax.grid(axis="x", visible=False)
fig.savefig(OUT / "exp1-time-by-model.png")
plt.close(fig)

# 4. Трудные теги: доля «сразу» (ответ модели без ошибок) по режимам, 10 самых трудных
#    (порядок — по худшей из двух долей «сразу»)
top = tags[:10]
fig, ax = plt.subplots(figsize=(9, 5))
ys = list(range(len(top)))[::-1]
h_ = 0.38
mdv = [100 * next(h[3] for h in hard if h[0] == t and h[1] == "markdown") for t in top]
jsv = [100 * next(h[3] for h in hard if h[0] == t and h[1] == "json") for t in top]
jsf = [100 * next(h[4] for h in hard if h[0] == t and h[1] == "json") for t in top]
ax.barh([y + h_ / 2 for y in ys], mdv, h_, color=FILLS[3][0], hatch=FILLS[3][1], edgecolor=EDGE, linewidth=0.6,
        label="markdown: ответ модели без ошибок")
ax.barh([y - h_ / 2 for y in ys], jsv, h_, color=FILLS[1][0], hatch=FILLS[1][1], edgecolor=EDGE, linewidth=0.6,
        label="json: ответ модели без ошибок")
ax.scatter(jsf, [y - h_ / 2 for y in ys], marker="D", s=26, color="#000", zorder=3, label="json: итог после попыток")
for y, v in zip(ys, mdv):
    ax.text(v + 1, y + h_ / 2, f"{v:.0f}", va="center", fontsize=8)
for y, v, f in zip(ys, jsv, jsf):
    ax.text(max(v, f) + 2.5, y - h_ / 2, f"{v:.0f} → {f:.0f}" if f != v else f"{v:.0f}", va="center", fontsize=8)
ax.set_yticks(ys, top)
ax.set_xlim(0, 118)
ax.set_xlabel("Доля запусков, % (все модели, оба повтора; n = 30–180 в режиме)")
ax.set_title("Самые трудные теги описаний (markdown: итог 100 % по всем тегам)", fontsize=11)
ax.legend(frameon=False, fontsize=8.5, loc="upper center", bbox_to_anchor=(0.45, -0.12), ncol=3)
ax.grid(axis="y", visible=False)
fig.savefig(OUT / "exp1-hard-tags.png")
plt.close(fig)

print((OUT / "exp1-tables.md").read_text(encoding="utf-8"))
