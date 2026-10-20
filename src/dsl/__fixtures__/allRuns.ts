// Все настоящие ответы нейросети, собранные на этапе 5: на них проверяется, что обработка не удаляет настоящие данные.
import { MANUAL_RUNS } from './manual.ts'
import { STEP8_RUNS } from './step8.ts'
import { STEP8_RUN2_RAW } from './step8run2.ts'
import { STEP8_RUN3_RAW } from './step8run3.ts'

export interface RealRun {
  name: string
  mode: 'markdown' | 'json'
  description: string
  /** Ответ модели: сырой (прогоны 2 и 3) или итоговый документ, как его увидел пользователь (прогон 1, ручные тесты) */
  output: string
}

export const ALL_REAL_RUNS: RealRun[] = [
  ...STEP8_RUNS.map((r) => ({ name: `run1/${r.id}/${r.mode}`, mode: 'markdown' as const, description: r.description, output: r.markdown })),
  ...STEP8_RUN2_RAW.map((r) => ({ name: `run2/${r.id}/${r.mode}`, mode: r.mode, description: r.description, output: r.output })),
  ...MANUAL_RUNS.map((r) => ({ name: `manual/${r.id}`, mode: 'markdown' as const, description: r.description, output: r.markdown })),
  ...STEP8_RUN3_RAW.map((r) => ({ name: `run3/${r.model.replace('GigaChat-', '')}/${r.id}/${r.mode}`, mode: r.mode, description: r.description, output: r.output })),
]
