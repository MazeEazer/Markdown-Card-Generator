export type TokenType =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'function'
  | 'type'
  | 'tag'
  | 'attr'
  | 'operator'
  | 'punctuation'

export interface Token {
  text: string
  type: TokenType
}

/**
 * Палитра токенов (GitHub Dark).
 * Кодовые блоки всегда рендерятся на тёмном фоне, поэтому цвета не зависят от темы
 * и корректно попадают в экспортируемый HTML через inline-стили.
 */
export const TOKEN_COLORS: Record<TokenType, string> = {
  plain: '#e6edf3',
  comment: '#8b949e',
  string: '#a5d6ff',
  number: '#79c0ff',
  keyword: '#ff7b72',
  function: '#d2a8ff',
  type: '#ffa657',
  tag: '#7ee787',
  attr: '#ffa657',
  operator: '#ff7b72',
  punctuation: '#c9d1d9',
}

const JS_KEYWORDS = [
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else',
  'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
  'of', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
  'yield', 'async', 'await', 'static', 'get', 'set', 'as', 'from', 'null', 'true', 'false', 'undefined', 'NaN',
]

const TS_KEYWORDS = [
  ...JS_KEYWORDS,
  'interface', 'type', 'enum', 'implements', 'declare', 'namespace', 'readonly', 'private', 'public',
  'protected', 'abstract', 'satisfies', 'keyof', 'infer', 'asserts', 'unknown', 'never', 'any', 'object',
  'string', 'number', 'boolean', 'symbol', 'bigint',
]

const PYTHON_KEYWORDS = [
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
  'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'self', 'None', 'True', 'False',
]

const CSS_KEYWORDS = ['important', 'media', 'supports', 'import', 'keyframes', 'from', 'to', 'and', 'not', 'url', 'calc', 'var', 'root']

const BASH_KEYWORDS = [
  'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return',
  'export', 'local', 'in', 'echo', 'cd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'sudo', 'npm', 'npx', 'git',
  'node', 'yarn', 'pnpm', 'docker', 'exit', 'set', 'source', 'cat', 'grep', 'chmod', 'curl',
]

const JSON_KEYWORDS = ['true', 'false', 'null']

interface LangConfig {
  keywords: string[]
  lineComments: string[]
  blockComment: boolean
  htmlComment: boolean
  htmlTags: boolean
  backtick: boolean
}

interface Rule {
  type: TokenType
  re: RegExp
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function configFor(lang: string): LangConfig | null {
  const key = lang.toLowerCase().replace(/^\./, '').trim()
  if (!key) return null

  // Базовая конфигурация: строки, числа, комментарии // и # (используется для неизвестных языков)
  const base: LangConfig = {
    keywords: [],
    lineComments: ['//', '#'],
    blockComment: true,
    htmlComment: false,
    htmlTags: false,
    backtick: true,
  }

  switch (key) {
    case 'js':
    case 'jsx':
    case 'javascript':
    case 'mjs':
    case 'cjs':
      return { ...base, keywords: JS_KEYWORDS }
    case 'ts':
    case 'tsx':
    case 'typescript':
      return { ...base, keywords: TS_KEYWORDS }
    case 'json':
    case 'jsonc':
      return { ...base, keywords: JSON_KEYWORDS, lineComments: [] }
    case 'py':
    case 'python':
      return { ...base, keywords: PYTHON_KEYWORDS, lineComments: ['#'], blockComment: false, backtick: false }
    case 'css':
    case 'scss':
    case 'less':
      return { ...base, keywords: CSS_KEYWORDS }
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'shell':
      return { ...base, keywords: BASH_KEYWORDS, lineComments: ['#'], blockComment: false, backtick: false }
    case 'html':
    case 'xml':
    case 'vue':
    case 'svg':
      return { ...base, lineComments: [], blockComment: false, htmlComment: true, htmlTags: true }
    default:
      return base
  }
}

function compileRules(config: LangConfig): Rule[] {
  const rules: Rule[] = []

  if (config.htmlComment) rules.push({ type: 'comment', re: /<!--[\s\S]*?-->/y })
  if (config.blockComment) {
    rules.push({ type: 'comment', re: /\/\*[\s\S]*?\*\//y })
    rules.push({ type: 'comment', re: /\/\*[\s\S]*$/y })
  }
  if (config.lineComments.length) {
    rules.push({
      type: 'comment',
      re: new RegExp(`(?:${config.lineComments.map(escapeRegExp).join('|')})[^\\n]*`, 'y'),
    })
  }

  rules.push({ type: 'string', re: /"(?:\\.|[^"\\\n])*"?/y })
  rules.push({ type: 'string', re: /'(?:\\.|[^'\\\n])*'?/y })
  if (config.backtick) rules.push({ type: 'string', re: /`(?:\\.|[^`\\])*`?/y })

  if (config.keywords.length) {
    const keywords = [...config.keywords].sort((a, b) => b.length - a.length).map(escapeRegExp)
    rules.push({ type: 'keyword', re: new RegExp(`\\b(?:${keywords.join('|')})\\b`, 'y') })
  }

  rules.push({ type: 'function', re: /[A-Za-z_$][\w$]*(?=\s*\()/y })
  rules.push({ type: 'type', re: /[A-Z][A-Za-z0-9_]*/y })

  if (config.htmlTags) {
    rules.push({ type: 'tag', re: /<\/?!?[A-Za-z][\w:.-]*/y })
    rules.push({ type: 'attr', re: /[A-Za-z_:][\w:.-]*(?=\s*=)/y })
    rules.push({ type: 'punctuation', re: /\/?>/y })
  }

  rules.push({ type: 'number', re: /\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/y })
  rules.push({ type: 'operator', re: /=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|\*\*|[+\-*/%=<>!?:&|^~]+/y })
  rules.push({ type: 'punctuation', re: /[{}()[\];,.@\\]/y })

  // Слово без подсветки (идентификатор) — чтобы не разбирать текст по одному символу
  rules.push({ type: 'plain', re: /[A-Za-z_$][\w$]*/y })

  return rules
}

/**
 * Разбивает код на токены для подсветки синтаксиса.
 * Без внешних зависимостей: правила применяются по позиции, поэтому строки и комментарии
 * выигрывают у ключевых слов внутри них.
 */
export function highlightCode(code: string, lang: string): Token[] {
  const config = configFor(lang)
  if (!config) return [{ text: code, type: 'plain' }]

  const rules = compileRules(config)
  const tokens: Token[] = []
  let index = 0
  let plainStart = -1

  const pushPlain = (end: number): void => {
    if (plainStart >= 0 && end > plainStart) {
      tokens.push({ text: code.slice(plainStart, end), type: 'plain' })
    }
    plainStart = -1
  }

  while (index < code.length) {
    let matched = false

    for (const rule of rules) {
      rule.re.lastIndex = index
      const match = rule.re.exec(code)
      if (match && match[0]) {
        pushPlain(index)
        tokens.push({ text: match[0], type: rule.type })
        index += match[0].length
        matched = true
        break
      }
    }

    if (!matched) {
      if (plainStart < 0) plainStart = index
      index += 1
    }
  }

  pushPlain(code.length)

  // Склеиваем соседние токены одного типа — меньше span'ов в разметке
  const merged: Token[] = []
  for (const token of tokens) {
    const previous = merged[merged.length - 1]
    if (previous && previous.type === token.type) previous.text += token.text
    else merged.push({ ...token })
  }

  return merged
}