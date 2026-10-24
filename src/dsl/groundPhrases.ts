// Рискованные фразы в свободном тексте (title, текст разделов, названия и описания услуг): расположение, формат,
// опыт, аудитория, обещания и «и другие услуги». Фраза остаётся, только если описание её подтверждает.
// Только для AI-генерации (generate.ts). Нейросеть упорно дописывала «Кофе с собой» в title и «индивидуальные
// уроки» в «О нас» — промпт не помогал. Сначала модели отправляется конкретный фрагмент (диагностика
// ungrounded-phrase, ошибка), если фраза осталась — она удаляется: title — поле целиком, название услуги — фраза,
// остальное — предложение. Подтверждения щедрые: ложное удаление настоящего факта хуже пропущенной выдумки.
import { applyCuts, itemLines, mergeCuts, wholeLines } from './cuts.ts'
import type { SectionNode } from './ast.ts'
import { parseDocument } from './parser.ts'
import { splice } from './prune.ts'
import type { Diagnostic, Range } from './types.ts'
import { letters } from './words.ts'

/** Код в журнале (fixed_codes) и диагностики: фраза без подтверждения в описании. */
export const UNGROUNDED_PHRASE = 'ungrounded-phrase'

/** Граница слова для кириллицы и латиницы. */
const W = '(?<![\\p{L}\\d])'
const re = (source: string, flags = 'iu') => new RegExp(source.replaceAll('<W>', W), flags)

interface PhraseRule {
  /** Что ловим в тексте (текст приведён к нижнему регистру, ё → е) */
  trigger: RegExp
  /** Что в описании её подтверждает (описание приведено так же) */
  confirm: RegExp
}

export const PHRASES: Record<string, PhraseRule> = {
  // Расположение
  center: {
    trigger: re('<W>в\\s+(?:самом\\s+)?центре(?![\\p{L}])', 'giu'),
    confirm: re('<W>центр(?:е|а|у|ом)?(?![\\p{L}])'),
  },
  metro: {
    trigger: re('<W>(?:рядом\\s+с|около|недалеко\\s+от|возле|у)\\s+метро', 'giu'),
    confirm: re('<W>метро'),
  },
  walking: {
    trigger: re('<W>(?:в\\s+)?(?:шаговой|пешей)\\s+доступности', 'giu'),
    confirm: re('<W>(?:шагов\\p{L}*|пешей)\\s+доступн|<W>пешком|<W>рядом\\s+с'),
  },
  // Формат
  takeaway: {
    trigger: re('<W>(?:с\\s+собой|навынос|на\\s+вынос)(?![\\p{L}])', 'giu'),
    confirm: re('<W>(?:с\\s+собой|навынос|на\\s+вынос|takeaway|take-away|to\\s+go)'),
  },
  individual: {
    // «индивидуальный подход» — оформление, не формат (правило 2 разметки): его не ловим
    trigger: re('<W>индивидуальн\\p{L}*(?![\\p{L}])(?!\\s+подход)', 'giu'),
    confirm: re('<W>(?:индивидуальн\\p{L}*(?![\\p{L}])(?!\\s+подход)|один\\s+на\\s+один|1\\s*(?:на|:)\\s*1|лично(?![\\p{L}])|персональн|частн\\p{L}*\\s+(?:урок|занят|тренир|консульт))'),
  },
  // «На дому» — мастер принимает у себя или выезжает; «у вас дома» — выезд к клиенту. «Стригу дома» подтверждает
  // первое, но не второе (так же, как ошибка «прямо у вас дома» в правилах разметки)
  atHome: {
    trigger: re('<W>на\\s+дому(?![\\p{L}])', 'giu'),
    confirm: re('<W>(?:на\\s+дому|дома(?![\\p{L}])|на\\s+дом(?![\\p{L}])|выезд\\p{L}*|выезж\\p{L}*|приед\\p{L}*)'),
  },
  visitClient: {
    trigger: re('<W>(?:выезд\\p{L}*\\s+на\\s+дом|(?:прямо\\s+)?у\\s+вас\\s+дома|на\\s+дом\\s+к\\s+клиент\\p{L}*|к\\s+клиент\\p{L}*\\s+(?:домой|на\\s+дом))', 'giu'),
    confirm: re('<W>(?:выезд\\p{L}*|выезж\\p{L}*|приед\\p{L}*\\s+к\\s+вам|на\\s+дом\\s+к|у\\s+клиент\\p{L}*|к\\s+вам\\s+(?:домой|на\\s+дом)|к\\s+клиент\\p{L}*)'),
  },
  byAppointment: {
    trigger: re('<W>по\\s+(?:предварительной\\s+)?записи', 'giu'),
    confirm: re('<W>запис\\p{L}*'),
  },
  // Опыт
  experience: {
    trigger: re('<W>(?:опыт\\p{L}*|стаж\\p{L}*|(?:\\d+\\s+)?лет\\s+(?:работы|опыта)|(?:более|свыше|больше)\\s+\\d+\\s+лет|с\\s+20\\d\\d\\s+года)', 'giu'),
    confirm: re('<W>(?:опыт|стаж|лет(?![\\p{L}])|с\\s+20\\d\\d|работаю\\s+с\\s)'),
  },
  // Аудитория
  forChildren: {
    trigger: re('<W>для\\s+детей', 'giu'),
    confirm: re('<W>(?:дет\\p{L}*|ребен\\p{L}*|школьник\\p{L}*|подростк\\p{L}*)'),
  },
  forAdults: {
    trigger: re('<W>(?:для|и)\\s+взрослых', 'giu'),
    confirm: re('<W>взросл'),
  },
  forFamily: {
    trigger: re('<W>(?:для\\s+всей\\s+семьи|для\\s+семей)', 'giu'),
    confirm: re('<W>сем(?:ь[яиюе]|ей|ейн\\p{L}*)'),
  },
  forExams: {
    trigger: re('<W>(?:подготовк\\p{L}*\\s+)?(?:к|для)\\s+(?:экзамен\\p{L}*|егэ|огэ)(?![\\p{L}])', 'giu'),
    confirm: re('<W>(?:экзамен|егэ|огэ|гиа)'),
  },
  // Обещания («лучше записаться» — не обещание, ловим только «лучший» и его формы)
  guarantee: {
    trigger: re('<W>гарант\\p{L}*', 'giu'),
    confirm: re('<W>гарант'),
  },
  best: {
    trigger: re('<W>лучш(?:ий|ие|ая|ее|ую|их|им|ими|ем|ей|ого|ему)(?![\\p{L}])', 'giu'),
    confirm: re('<W>лучш'),
  },
  numberOne: {
    trigger: re('(?:№\\s*1(?!\\d)|<W>номер\\s+(?:один|1)(?![\\p{L}\\d])|#1(?!\\d))', 'giu'),
    confirm: re('(?:№\\s*1(?!\\d)|<W>номер\\s+(?:один|1)|#1|<W>топ)'),
  },
  // «И другое»
  andOthers: {
    // «и другие / и прочие» + одно-два любых слова: «и другие услуги», «и другие стоматологические проблемы», «и прочие процедуры»
    trigger: re('<W>(?:(?:и|а\\s+также)\\s+(?:другие|прочие|иные)(?:\\s+\\p{L}+){1,2}|и\\s+многое\\s+другое|и\\s+прочее|и\\s+т\\.\\s?[дп]\\.?)', 'giu'),
    confirm: re('<W>(?:(?:и|а\\s+также)\\s+(?:другие|прочие|иные)|многое\\s+другое|и\\s+прочее|и\\s+т\\.?\\s?[дп]|и\\s+др(?![\\p{L}])|и\\s+пр\\.)'),
  },
}

export type PhraseScope = 'title' | 'text' | 'service-title' | 'service-description'

export interface PhraseHit {
  scope: PhraseScope
  /** Диапазон фразы в тексте документа */
  from: number
  to: number
  fragment: string
  /** Поле целиком (для title и полей услуги) или участок текста раздела — где искали */
  field: { from: number; to: number; lineFrom: number; lineTo: number; item?: Range }
  section?: SectionNode
}

const WHERE: Record<PhraseScope, string> = {
  title: 'title',
  text: 'текста раздела',
  'service-title': 'названия услуги',
  'service-description': 'описания услуги',
}

/** Участки свободного текста раздела: тело без заголовка и без блоков. */
function textSegments(section: SectionNode, text: string): Range[] {
  const start = section.headingRange ? text.indexOf('\n', section.headingRange.to - 1) + 1 || section.to : section.from
  const segments: Range[] = []
  let cursor = Math.min(start, section.to)
  for (const block of [...section.blocks].sort((a, b) => a.from - b.from)) {
    if (block.from > cursor) segments.push({ from: cursor, to: Math.min(block.from, section.to) })
    cursor = Math.max(cursor, block.to)
  }
  if (cursor < section.to) segments.push({ from: cursor, to: section.to })
  return segments
}

/** Фразы без подтверждения в описании — по всему свободному тексту документа. */
export function findPhraseHits(text: string, description: string): PhraseHit[] {
  const ast = parseDocument(text)
  const lowerDescription = letters(description)
  const unconfirmed = Object.values(PHRASES).filter((rule) => !rule.confirm.test(lowerDescription))
  if (!unconfirmed.length) return []
  const lowerText = letters(text)
  const hits: PhraseHit[] = []

  const scan = (scope: PhraseScope, range: Range, extra: Partial<PhraseHit> & { field: PhraseHit['field'] }) => {
    const slice = lowerText.slice(range.from, range.to)
    for (const rule of unconfirmed) {
      for (const match of slice.matchAll(rule.trigger)) {
        const from = range.from + match.index
        const to = from + match[0].length
        hits.push({ scope, from, to, fragment: text.slice(from, to), ...extra })
      }
    }
  }

  const title = ast.frontmatter?.fields.find((f) => f.key === 'title')
  if (title?.valueRange) {
    const line = wholeLines(text, title.keyRange.from, title.valueRange.to)
    scan('title', title.valueRange, { field: { ...title.valueRange, lineFrom: line.from, lineTo: line.to } })
  }

  for (const section of ast.sections) {
    for (const segment of textSegments(section, text)) {
      scan('text', segment, { field: { ...segment, lineFrom: segment.from, lineTo: segment.to }, section })
    }
    for (const block of section.blocks) {
      if (block.name !== 'services') continue
      for (const item of block.items) {
        for (const field of item.fields) {
          if (field.key !== 'title' && field.key !== 'description') continue
          const line = wholeLines(text, field.from, field.to)
          scan(field.key === 'title' ? 'service-title' : 'service-description', field.valueRange, {
            field: { ...field.valueRange, lineFrom: line.from, lineTo: line.to, item: { from: item.from, to: item.to } },
            section,
          })
        }
      }
    }
  }
  return hits.sort((a, b) => a.from - b.from)
}

/** Диагностики для запроса на исправление: фрагмент и где он. */
export function findUngroundedPhrases(text: string, description: string): Diagnostic[] {
  return findPhraseHits(text, description).map((hit) => ({
    from: hit.from,
    to: hit.to,
    severity: 'error' as const,
    code: UNGROUNDED_PHRASE,
    message: `Уберите «${hit.fragment}» из ${WHERE[hit.scope]} — этого нет в описании`,
  }))
}

/** Граница предложения: знак конца после слова из 3+ знаков («ул.», «т.» и «г.» — не граница). */
const SENTENCE_END = /(?<=[\p{L}\d]{3,})[.!?…]+(?=\s|$)/gu
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/

/** Предложение вокруг фразы внутри её строки: [from, to) и признак «в строке больше ничего нет». */
function sentenceAround(text: string, hit: PhraseHit): { range: Range; wholeLine: boolean } {
  // Для поля услуги — только значение (без «description: »), для текста раздела — строка внутри участка
  const lineFrom = Math.max(hit.field.from, text.lastIndexOf('\n', hit.from - 1) + 1)
  const newline = text.indexOf('\n', hit.to)
  const lineTo = Math.min(hit.field.to, newline === -1 ? text.length : newline)
  const line = text.slice(lineFrom, lineTo)
  const marker = line.match(LIST_MARKER)?.[0].length ?? 0
  let start = lineFrom + marker
  let end = lineTo
  for (const m of line.matchAll(SENTENCE_END)) {
    const boundary = lineFrom + m.index + m[0].length
    if (boundary <= hit.from) start = boundary
    else if (lineFrom + m.index >= hit.to) {
      end = boundary
      break
    }
  }
  while (start < hit.from && /\s/.test(text[start])) start++
  const restBefore = text.slice(lineFrom + marker, start).trim()
  const restAfter = text.slice(end, lineTo).trim()
  return { range: { from: start, to: end }, wholeLine: !restBefore && !restAfter }
}

export interface RemovePhrasesResult {
  text: string
  removed: string[]
}

/** Убирает неподтверждённые фразы: title — поле целиком, название услуги — фраза (пустое — услуга), остальное — предложение. */
export function removeUngroundedPhrases(text: string, description: string): RemovePhrasesResult {
  const hits = findPhraseHits(text, description)
  if (!hits.length) return { text, removed: [] }
  const cuts: Range[] = []
  const removed: string[] = []
  const emptied = new Set<string>()

  const serviceTitles = new Map<string, PhraseHit[]>()
  for (const hit of hits) {
    removed.push(UNGROUNDED_PHRASE)
    if (hit.scope === 'title') {
      cuts.push({ from: hit.field.lineFrom, to: hit.field.lineTo })
    } else if (hit.scope === 'service-title') {
      const key = String(hit.field.from)
      serviceTitles.set(key, [...(serviceTitles.get(key) ?? []), hit])
    } else {
      const { range, wholeLine } = sentenceAround(text, hit)
      if (hit.scope === 'service-description' && wholeLine) cuts.push({ from: hit.field.lineFrom, to: hit.field.lineTo })
      else if (wholeLine) cuts.push(wholeLines(text, range.from, range.to))
      else {
        // Предложение и пробел после него
        let { to } = range
        while (text[to] === ' ') to++
        cuts.push({ from: range.from, to })
      }
      if (hit.section?.title) emptied.add(hit.section.title)
    }
  }

  for (const group of serviceTitles.values()) {
    const { field } = group[0]
    // Фраза вместе с пробелами перед ней; что осталось от названия — если ничего, услуга убирается целиком
    const pieces = group.map((hit) => {
      let from = hit.from
      while (from > field.from && text[from - 1] === ' ') from--
      return { from, to: hit.to }
    })
    const rest = applyCuts(text.slice(field.from, field.to), pieces.map((p) => ({ from: p.from - field.from, to: p.to - field.from })))
    if (/[\p{L}\d]/u.test(rest)) cuts.push(...pieces)
    else if (field.item) cuts.push(itemLines(text, field.item.from, field.item.to))
  }

  // Если вырезанное — конец строки, пробел перед ним тоже уходит («Уютно. Лучшие напитки!» → «Уютно.»)
  const merged = mergeCuts(cuts).map(({ from, to }) => {
    if (to < text.length && text[to] !== '\n') return { from, to }
    while (from > 0 && text[from - 1] === ' ') from--
    return { from, to }
  })
  let result = applyCuts(text, merged)
  // Раздел, в котором не осталось ни текста, ни блоков, убираем вместе с заголовком
  if (emptied.size) {
    for (const section of [...parseDocument(result).sections].reverse()) {
      if (!section.headingRange || !emptied.has(section.title) || section.blocks.length) continue
      const body = result.slice(result.indexOf('\n', section.headingRange.to - 1) + 1 || section.to, section.to)
      if (!body.trim()) result = splice(result, section.from, section.to)
    }
  }
  return { text: result, removed }
}
