export const DEFAULT_TASK_SEARCH_TERM_KEY = 'FALL_2026' as const

export const TASK_SEARCH_TERM_OPTIONS = [
  { key: 'FALL_2026', label: 'Fall 2026' },
  { key: 'SUMMER_2026', label: 'Summer 2026' },
] as const

export type TaskSearchTermKey = (typeof TASK_SEARCH_TERM_OPTIONS)[number]['key']
