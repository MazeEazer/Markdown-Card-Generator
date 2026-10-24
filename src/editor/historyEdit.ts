// Правка текста не от набора (перетащили фото): одна транзакция и отдельный шаг истории — Cmd+Z отменяет её
// целиком и не склеивает с соседним набором. Выделение сдвигается вместе с текстом, прокрутка не меняется.
import { isolateHistory } from '@codemirror/commands'
import type { TransactionSpec } from '@codemirror/state'
import type { TextChange } from '../dsl/frontmatterEdit'

export function historyEdit(change: TextChange, userEvent: string): TransactionSpec {
  return { changes: change, userEvent, annotations: isolateHistory.of('full') }
}
