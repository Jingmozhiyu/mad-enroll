# Course grade pages

Course pages use readable identifiers, for example `/courses/COMPSCI_300` and
`/courses/COMPSCI_ECE_354`. Spaces inside subject abbreviations are removed,
abbreviations are uppercase, and cross-listed subjects are ordered by their UW
subject codes. Meaningful punctuation is URL-encoded, such as
`/courses/C%26ESOC_140` for `C&ESOC 140`.

Existing Madgrades UUID URLs redirect permanently to the readable URL; the
static page cannot read the query, so query parameters are dropped. A unique single-subject alias for a cross-listed course also
redirects to its full identifier. Resolution checks exact course numbers and
subjects; ambiguous historical identities are not merged. The page's canonical
URL excludes interactive filter parameters.

## HTML and charts

Each course has one URL. It opens the original instructor and semester comparison
charts, unchanged; they are drawn in the browser, and the server HTML holds a
placeholder in their place. The server HTML also carries a text alternative for
the charts: course heading, average GPA, A rate, record counts, coverage, the
letter-grade table and every reported term. It is visually hidden (`sr-only`),
so the page looks like the chart view, but screen readers and clients without
JavaScript can read it, and it stays in the page after the charts load. It must
only restate data the charts show; adding other text would make it hidden text
under Google's spam policies. The HTML omits the separate non-letter-grade table and methodology section;
calculation details remain in the API reference and this documentation.

Instructor and semester filters add `instructorId` and `termCode` to the course
URL; the canonical URL excludes them. Older `?view=charts` links load the same
page. Search results and autocomplete open the course URL. Results and pagination
use ordinary links with their existing visual appearance.

Course pages and the directory are static: each URL is rendered on its first
request and then served from the CDN for 30 days. The directory's public
`/course?subject=266&page=2` URLs are rewritten in `next.config.ts` to the static
`/course/[subject]/[page]` route without changing the browser URL.

The `/course` dataset directory is linked from the footer. It describes the data
and offers links to interactive course search and seat alerts. Subject links and
paginated course lists lead to HTML data pages, so the directory can be traversed
without JavaScript.

## Public grade API

The footer places **Grade Dataset** and **API Reference** quietly on the right,
while the course-update text and GitHub link remain centered. `/openapi` is a
server-rendered reference with endpoint and parameter tables, calculation rules,
error codes and response schemas. `/openapi.json` publishes its OpenAPI 3.1
contract; a `service-desc` link in the HTML head and successful API responses
points to the specification. No login or API key is required.

- `GET /api/grades/subjects` returns the complete subject catalog.
- `GET /api/grades/courses?subjectId=266&page=1` returns up to 100 courses and
  `nextPageUrl`; follow it until null. Subject IDs come from the subject endpoint.
- `GET /api/grades/courses/COMPSCI_300` returns course identity, a canonical HTML
  citation URL, MadEnroll provider information, coverage, cumulative grades and semester
  grades. Unique aliases and legacy UUIDs resolve to the canonical course code
  in the response. `gpa` and `aPercent` are null when no letter grades exist;
  `aPercent` uses a 0–100 scale and `uCount` reports U grades.

The API reuses the HTML pages' cached upstream loaders and calculation functions.
Successful JSON responses can be cached for up to one hour. Invalid queries
return 400, missing records/pages 404, ambiguous course codes 409, and unavailable
data 503. Errors contain a safe `message` and are not cached. No alternate dataset,
new data store, or upstream update schedule is introduced.

## Data and calculations

Madgrades is the grade-data source. Course details, exact identifier lookups,
subject catalogs and grade responses are cached for 30 days, matching the static
pages' revalidation period, so new semester data can take up to 30 days to
appear; free-text search
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

## Search discovery and metadata

`/robots.txt` allows public HTML, assets and `/api/grades/`, excludes `/admin`
and the other `/api/` operations, and advertises `/sitemap.xml`. The sitemap index
links a public-page sitemap and a complete sitemap for each subject using
`/sitemap.xml?section=pages` and `/sitemap.xml?subject=266`. Every upstream catalog
page is included. Cross-listed courses appear once, under their first UW subject;
ambiguous historical course codes are omitted. Only canonical HTML course URLs
are listed, without UUID aliases or filter parameters. XML is escaped and
no invented modification dates are published. A failed catalog request returns
503 rather than a partial or fallback sitemap.

The homepage search title and description live in `frontend/lib/seo.ts`
(`SITE_TITLE` and `SITE_DESCRIPTION`), shared with its Open Graph, Twitter and
WebSite structured data. Its short visible service description lives in
`frontend/components/home/welcome-hero.tsx`. Other page descriptions are in the
corresponding `app/**/page.tsx` metadata exports. Public pages have canonical URLs;
filtered search pages use normalized self-canonicals and `noindex, follow`, while
the default search page remains indexable. Course data pages also expose Dataset
structured data with MadEnroll as provider and the public JSON URL. Admin pages are noindex.
Google may choose a query-specific snippet instead of the supplied description.

The monitor page's search title and description are also in `frontend/lib/seo.ts`
(`MONITOR_TITLE` and `MONITOR_DESCRIPTION`), shared with its Open Graph and Twitter
metadata. They describe seat alerts, course monitoring, course sniping and seat
status tracking. The visible interface retains **Seat Alerts** / **alerts**, and
internal records retain **subscription**. These search terms add no hidden body
text, crawler-specific content or keyword-only routes; `enroll alert` is excluded.
Metadata can appear in browser tabs, search snippets and link previews.

The default `/search` list is curated in `FEATURED_COURSES` in
`frontend/app/search/page.tsx`: ANTHRO 104, BIOCHEM 104, CURRIC 277, L I S 202 and
NUTR SCI 132, in that order. It loads exact course identities and has no
pagination. Queries, filters, explicit sorting and later pages retain the existing
search behavior. Clearing the form returns to the curated list. There is no
alternate local dataset or random-result fallback.

## Verification

Use Node.js 24 and run `npm run lint` and `npm run build` from `frontend/`.
Inspect the production HTML, metadata, robots, XML sitemaps, public JSON and
search interactions directly. The course/SEO work adds no permanent test suite
or text assertions, so editorial changes do not require updating test fixtures.
