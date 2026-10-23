# Course grade pages

Course pages use readable identifiers, for example `/courses/COMPSCI_300` and
`/courses/COMPSCI_ECE_354`. Spaces inside subject abbreviations are removed,
abbreviations are uppercase, and cross-listed subjects are ordered by their UW
subject codes. Meaningful punctuation is URL-encoded, such as
`/courses/C%26ESOC_140` for `C&ESOC 140`.

Existing Madgrades UUID URLs redirect permanently to the readable URL, preserving
query parameters. A unique single-subject alias for a cross-listed course also
redirects to its full identifier. Resolution checks exact course numbers and
subjects; ambiguous historical identities are not merged. The page's canonical
URL excludes interactive filter parameters.

## HTML and charts

The default response contains server-rendered course information, grade counts,
letter-grade percentages, semester statistics, coverage and source references.
Reading these tables does not require JavaScript. An understated **Interactive
charts** link opens `?view=charts`, which loads the original instructor and
semester comparison interface. The chart view has no data-view switch or added
explanatory text. Its canonical URL remains the course URL without parameters.

Search results and autocomplete open chart URLs directly, preserving the search
workflow. Instructor and semester filters retain `view=charts` on the readable
course path. Results and pagination use ordinary links with their existing visual
appearance.

The `/course` dataset directory is linked from the footer. It describes the data
and offers links to interactive course search and seat alerts. Subject links and
paginated course lists lead to HTML data pages, so the directory can be traversed
without JavaScript.

## Data and calculations

Madgrades is the grade-data source. Course details, exact identifier lookups,
subject catalogs and grade responses are cached for 24 hours; free-text search
requests are not cached. This is a request cache, not a second dataset. Grade
coverage is derived from the available grade terms and is distinct from the
current course-catalog semester. Madgrades does not supply a record update date.

GPA is the count-weighted mean of A, AB, B, BC, C, D and F, using grade points
4, 3.5, 3, 2.5, 2, 1 and 0. Letter-grade percentages use those same seven
categories as their denominator. Other reported grades, including U, are listed
separately. With no letter grades, GPA and percentages are unavailable rather
than zero. Counts represent grade records, not distinct students or
credit-weighted student GPAs. Historical grades do not measure workload.

Source-provided aggregates take precedence; missing aggregates are calculated
from available lower-level records. Jointly taught sections are not counted
again when forming course totals. Unknown courses return 404; upstream failures
and ambiguous identities produce an error instead of a successful empty grade
page. Upstream error bodies are not displayed.

## Verification

Use Node.js 24, then run from `frontend/`:

```sh
npm run test
npm run lint
npm run build
npm run test:course-pages
```

The HTTP integration suite starts the production build and a local mock Madgrades
server. It checks the raw HTML, canonical metadata, redirects, exact identity
resolution, missing courses, non-letter grades, upstream failures, search links
and fetch-cache reuse without querying the real upstream service.
