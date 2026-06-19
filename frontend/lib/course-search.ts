const COURSE_SEARCH_PATTERN = /^[\p{L}\p{N}\s.,&()\/+\-]+$/u
export const COURSE_SEARCH_NOT_FOUND_MESSAGE = 'Course not found. Check the input? (Hint: spaces are necessary. e.g. L I S 202.)'
export const COURSE_SEARCH_FAILURE_MESSAGE =
  'Search failed. Please try another course query.'
export const COURSE_SELECTION_MESSAGE = 'Choose a course to view its sections.'
export const SECTION_SELECTION_MESSAGE = 'Choose a section to add it to your monitor list.'

export function normalizeCourseSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function getCourseSearchValidationMessage(value: string) {
  const query = normalizeCourseSearchQuery(value)

  if (!query) {
    return 'Please enter a course name before searching.'
  }

  if (query.length < 2) {
    return 'Enter at least 2 characters before searching.'
  }

  if (query.length > 80) {
    return 'Keep the search under 80 characters.'
  }

  if (!COURSE_SEARCH_PATTERN.test(query)) {
    return 'Use letters, numbers, spaces, and basic course separators only.'
  }

  return null
}

export function normalizeCourseSearchErrorMessage(
  error: unknown,
  fallbackMessage = COURSE_SEARCH_FAILURE_MESSAGE,
) {
  const message =
    typeof error === 'string'
      ? error.trim()
      : error instanceof Error
        ? error.message.trim()
        : ''

  if (!message) {
    return fallbackMessage
  }

  if (/wrong input|course not found|no matching course|no such course/i.test(message)) {
    return COURSE_SEARCH_NOT_FOUND_MESSAGE
  }

  if (
    /duplicate entry|could not execute statement|constraint|sql|syntax|jdbc|hibernate|insert into|update .* set|select .* from|delete from/i.test(
      message,
    )
  ) {
    return fallbackMessage
  }

  return message
}
