import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import {setTimeout} from 'node:timers/promises'
import {after, before, test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {COURSE_UUID, CROSS_LISTED_UUID, startMockMadgrades} from './fixtures/madgrades-server.mjs'

let fixture
let app
let origin
let output = ''

before(async () => {
    fixture = await startMockMadgrades()
    const reservation = createServer()
    await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve))
    const port = reservation.address().port
    await new Promise((resolve) => reservation.close(resolve))
    origin = `http://127.0.0.1:${port}`
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        env: {...process.env, MADGRADES_API: fixture.url, MADGRADES_API_TOKEN: 'fixture-token',
            API_BASE_URL: fixture.url, NEXT_TELEMETRY_DISABLED: '1'},
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    app.stdout.on('data', (chunk) => {output += chunk})
    app.stderr.on('data', (chunk) => {output += chunk})
    for (let attempt = 0; attempt < 100; attempt += 1) {
        if (app.exitCode !== null) throw new Error(`Next exited: ${output}`)
        try {
            await fetch(origin, {signal: AbortSignal.timeout(1000)})
            return
        } catch {
            await setTimeout(100)
        }
    }
    throw new Error(`Next did not start: ${output}`)
}, {timeout: 20000})

after(async () => {
    if (app && app.exitCode === null) {
        app.kill('SIGTERM')
        await new Promise((resolve) => app.once('exit', resolve))
    }
    if (fixture) await new Promise((resolve) => fixture.server.close(resolve))
})

async function page(path) {
    const response = await fetch(origin + path, {redirect: 'manual'})
    return {response, html: await response.text()}
}

function withoutScripts(html) {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
}

test('default raw HTML includes citable statistics, semantic tables and canonical metadata', async () => {
    const {response, html} = await page('/courses/COMPSCI_300')
    assert.equal(response.status, 200)
    const visibleHtml = withoutScripts(html)
    assert.match(visibleHtml, /<title>COMP SCI 300: Programming II/)
    assert.match(visibleHtml, /rel="canonical" href="https:\/\/madenroll.com\/courses\/COMPSCI_300"/)
    assert.match(visibleHtml, /3\.85 average GPA/)
    assert.match(visibleHtml, /80\.0% A rate/)
    assert.match(visibleHtml, /100 letter-grade/)
    assert.match(visibleHtml, /<table[\s\S]*?Letter-grade distribution|Letter-grade distribution[\s\S]*?<table/)
    assert.match(visibleHtml, /Fall 2024/)
    assert.match(visibleHtml, /Spring 2025/)
    assert.match(visibleHtml, /Sources and methodology/)
    assert.match(visibleHtml, /<a[^>]*class="[^"]*underline[^"]*"[^>]*href="\/courses\/COMPSCI_300\?view=charts"/)
    assert.doesNotMatch(visibleHtml, /View grade tables|View interactive charts/)
    assert.doesNotMatch(visibleHtml, /recharts-wrapper|recharts-surface/)
})

test('legacy UUID, lowercase and single-subject aliases redirect to the canonical code and preserve filters', async () => {
    for (const path of [`/courses/${COURSE_UUID}`, '/courses/compsci_300']) {
        const {response} = await page(`${path}?termCode=1254&instructorId=1`)
        assert.equal(response.status, 308)
        assert.equal(response.headers.get('location'), '/courses/COMPSCI_300?termCode=1254&instructorId=1')
    }
    for (const path of [`/courses/${CROSS_LISTED_UUID}`, '/courses/ECE_354', '/courses/ECE_COMPSCI_354']) {
        const {response} = await page(path)
        assert.equal(response.status, 308)
        assert.equal(response.headers.get('location'), '/courses/COMPSCI_ECE_354')
    }
    assert.equal((await page('/courses/COMPSCI_ECE_354')).response.status, 200)
})

test('unknown course codes and UUIDs return real 404 responses', async () => {
    for (const path of ['/courses/COMPSCI_301', '/courses/UNKNOWN_300', '/courses/not-a-course',
        '/courses/99999999-9999-4999-8999-999999999999']) {
        const {response, html} = await page(path)
        assert.equal(response.status, 404, path)
        assert.match(html, /Course not found/)
    }
})

test('non-letter-only grades remain unavailable instead of zero GPA or A rate', async () => {
    const {response, html} = await page('/courses/ART_100')
    assert.equal(response.status, 200)
    const visibleHtml = withoutScripts(html)
    assert.match(visibleHtml, /No letter-grade records are available/)
    assert.match(visibleHtml, /N\/A/)
    assert.doesNotMatch(visibleHtml, /0\.00 average GPA|0\.0% A rate/)
})

test('upstream failures and ambiguous historical identities cannot become successful grade pages', async () => {
    for (const path of ['/courses/HISTORY_999', '/courses/SOC_101']) {
        const {response, html} = await page(path)
        assert.equal(response.status, 500, path)
        assert.doesNotMatch(html, /PRIVATE_UPSTREAM_ERROR_BODY|0\.00 average GPA/)
    }
})

test('search results and suggestions open charts directly, with normal pagination links', async () => {
    const {response, html} = await page('/search')
    assert.equal(response.status, 200)
    assert.match(html, /href="\/courses\/COMPSCI_300\?view=charts"/)
    assert.match(html, /href="\/courses\/COMPSCI_ECE_354\?view=charts"/)
    const paginationUrls = [...html.matchAll(/href="([^" ]+)"/g)]
        .map((match) => new URL(match[1].replaceAll('&amp;', '&'), origin))
    assert.ok(paginationUrls.some((url) => url.pathname === '/search' && url.searchParams.get('page') === '2'))
    const suggestions = await (await fetch(origin + '/api/madgrades/course-suggestions?query=programming')).json()
    assert.equal(suggestions[0].path, '/courses/COMPSCI_300?view=charts')
})

test('chart URLs retain the data canonical without added switches or dataset copy', async () => {
    const {response, html} = await page('/courses/COMPSCI_300?view=charts&termCode=1254')
    assert.equal(response.status, 200)
    const visibleHtml = withoutScripts(html)
    assert.match(visibleHtml, /rel="canonical" href="https:\/\/madenroll.com\/courses\/COMPSCI_300"/)
    assert.doesNotMatch(visibleHtml, /View grade tables|View interactive charts|Sources and methodology|Letter-grade distribution/)
    assert.doesNotMatch(visibleHtml, /Grade coverage varies by course/)
    assert.match(visibleHtml, /Courses updated <span[^>]*>Spring 2027<\/span>\./)
})

test('the dataset directory links subjects to HTML course records and guides interactive visitors', async () => {
    const {response, html} = await page('/course')
    assert.equal(response.status, 200)
    const visibleHtml = withoutScripts(html)
    assert.match(visibleHtml, /UW–Madison Grade Distribution Dataset/)
    assert.match(visibleHtml, /href="\/search"/)
    assert.match(visibleHtml, /href="\/monitor"/)
    assert.match(visibleHtml, /href="\/course\?subject=266"/)
    const subject = await page('/course?subject=266')
    assert.equal(subject.response.status, 200)
    assert.match(subject.html, /href="\/courses\/COMPSCI_300"/)
    assert.match(subject.html, /href="\/courses\/COMPSCI_ECE_354"/)
    assert.doesNotMatch(subject.html, /href="\/courses\/COMPSCI_300\?view=charts"/)
    for (const path of ['/course?subject=unknown', '/course?subject=266&page=999', '/course?page=-1']) {
        assert.equal((await page(path)).response.status, 404, path)
    }
})

test('repeated public grade requests reuse the upstream fetch cache', async () => {
    await page('/courses/COMPSCI_300')
    const key = `/v1/courses/${COURSE_UUID}/grades`
    const initial = fixture.requests.get(key)
    assert.ok(initial >= 1)
    await page('/courses/COMPSCI_300?termCode=1254')
    assert.equal(fixture.requests.get(key), initial)
})
