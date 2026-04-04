import 'server-only'
import {
  DEFAULT_TASK_SEARCH_TERM_KEY,
  TASK_SEARCH_TERM_OPTIONS,
  type TaskSearchTermKey,
} from '@/lib/task-search-terms'

const TASK_SEARCH_TERM_ID_BY_KEY: Record<TaskSearchTermKey, string> = {
  FALL_2026: process.env.FALL_2026 || '1272',
  SUMMER_2026: process.env.SUMMER_2026 || '1266',
}

export function resolveTaskSearchTermId(termKey?: string | null) {
  if (!termKey) {
    return TASK_SEARCH_TERM_ID_BY_KEY[DEFAULT_TASK_SEARCH_TERM_KEY]
  }

  const matchingTerm = TASK_SEARCH_TERM_OPTIONS.find((option) => option.key === termKey)

  return matchingTerm
    ? TASK_SEARCH_TERM_ID_BY_KEY[matchingTerm.key]
    : TASK_SEARCH_TERM_ID_BY_KEY[DEFAULT_TASK_SEARCH_TERM_KEY]
}
