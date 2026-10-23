import type {Metadata} from 'next'
import Link from 'next/link'
import {gradeApiEndpoints, gradeApiMethodology, gradeApiSpec} from '@/lib/madgrades/openapi'

export const metadata: Metadata = {
    title: 'Grade Data API Reference | MadEnroll',
    description: 'Public UW–Madison grade distribution API: readable course codes, cumulative and semester grades, GPA, A rates and data provenance. OpenAPI 3.1 specification.',
    alternates: {canonical: '/openapi'},
}

/** Server-renders endpoint tables and schemas for readers and crawlers. */
export default function OpenApiPage() {
    return (
        <article className="mx-auto max-w-4xl space-y-10 pb-4 text-sm leading-7">
            <header className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">Grade Data API Reference</h2>
                <p className="max-w-[72ch] text-[var(--color-ink-soft)]">
                    Public, read-only UW–Madison grade distributions provided by MadEnroll. No API key or login required.
                    The API and <Link className="course-data-link" href="/course">Grade Dataset</Link> use the same data and calculations.
                </p>
                <p><a className="course-data-link" href="/openapi.json" type="application/vnd.oai.openapi+json">OpenAPI 3.1 JSON</a></p>
                <p className="text-[var(--color-ink-soft)]">Base URL: <code>https://madenroll.com</code> · JSON responses · GET requests only</p>
            </header>

            <section className="space-y-4" aria-labelledby="api-quick-start">
                <h3 id="api-quick-start" className="text-xl font-semibold">Quick start</h3>
                <p>Look up a course directly, or discover subjects and follow their paginated course lists. Use <code>course.canonicalUrl</code> when citing a course’s HTML data page.</p>
                <pre className="overflow-x-auto rounded-lg border border-[var(--surface-divider)] p-4 text-xs leading-6"><code>{`curl 'https://madenroll.com/api/grades/courses/COMPSCI_300'
curl 'https://madenroll.com/api/grades/subjects'
curl 'https://madenroll.com/api/grades/courses?subjectId=266&page=1'`}</code></pre>
                <p>Identifiers remove spaces within subjects and use underscores between cross-listed subjects: <code>COMPSCI_300</code> or <code>COMPSCI_ECE_354</code>. Cross-listings are ordered by UW subject ID. URL-encode punctuation, for example <code>C%26ESOC_140</code>.</p>
            </section>

            {gradeApiEndpoints.map((endpoint) => (
                <section key={endpoint.path} id={endpoint.operationId} className="space-y-4 border-t border-[var(--surface-divider)] pt-6">
                    <h3 className="text-xl font-semibold">{endpoint.summary}</h3>
                    <p className="break-all font-mono text-xs"><strong>GET</strong> {endpoint.path}</p>
                    <p>{endpoint.description}</p>
                    {endpoint.parameters.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <caption className="sr-only">Parameters for {endpoint.summary}</caption>
                                <thead><tr className="border-b border-[var(--surface-divider)]"><th className="py-2 pr-4">Parameter</th><th className="py-2 pr-4">Location</th><th className="py-2">Description</th></tr></thead>
                                <tbody>{endpoint.parameters.map((parameter) => (
                                    <tr key={parameter.name} className="border-b border-[var(--surface-divider)] align-top">
                                        <th scope="row" className="py-3 pr-4 font-mono text-xs">{parameter.name}</th>
                                        <td className="py-3 pr-4">{parameter.in}<br/>{parameter.required ? 'Required' : 'Optional'}</td>
                                        <td className="py-3">{parameter.description}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                    <p>200: <a className="course-data-link" href={`#schema-${endpoint.schema}`}>{endpoint.schema}</a>. Error status codes: {endpoint.errors.join(', ')}.</p>
                </section>
            ))}

            <section className="space-y-4 border-t border-[var(--surface-divider)] pt-6" aria-labelledby="api-methodology">
                <h3 id="api-methodology" className="text-xl font-semibold">Data and calculations</h3>
                <p>{gradeApiMethodology}</p>
                <p>Coverage lists the first and last available terms and the number of reported terms for each course; gaps can exist. Record update dates are not available. Upstream responses are cached for 24 hours; this does not imply new grades are available. Successful API responses may be cached for up to one hour.</p>
                <p>400 means invalid query parameters; 404 means a course, subject or page was not found; 409 means an ambiguous course code; 503 means data is temporarily unavailable. Errors return <code>{'{"message":"…"}'}</code> and are not cached.</p>
            </section>

            <section className="space-y-4 border-t border-[var(--surface-divider)] pt-6" aria-labelledby="api-schemas">
                <h3 id="api-schemas" className="text-xl font-semibold">Response schemas</h3>
                <p>All fields shown in each object are required. Nullable metrics indicate unavailable data. Expand a schema to view its complete OpenAPI definition.</p>
                {Object.entries(gradeApiSpec.components.schemas).map(([name, schema]) => (
                    <details key={name} id={`schema-${name}`} className="border-b border-[var(--surface-divider)] pb-3">
                        <summary className="cursor-pointer font-mono text-xs font-semibold">{name}</summary>
                        <pre className="mt-3 overflow-x-auto text-xs leading-6"><code>{JSON.stringify(schema, null, 2)}</code></pre>
                    </details>
                ))}
            </section>
        </article>
    )
}
