import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
        // Route changes and alert-list updates animate through React's <ViewTransition>.
        viewTransition: true,
    },
    async rewrites() {
        return {
            // A static page cannot read the query string, so the public /course?subject=…&page=… URLs
            // are served as /course/[subject]/[page] by the static app/course/[[...segments]] route.
            // beforeFiles is required because /course itself matches that route. The browser URL does not change.
            beforeFiles: [
                {
                    source: '/course',
                    has: [{type: 'query', key: 'subject', value: '(?<subject>.+)'}, {type: 'query', key: 'page', value: '(?<page>.*)'}],
                    destination: '/course/:subject/:page',
                },
                {
                    source: '/course',
                    has: [{type: 'query', key: 'subject', value: '(?<subject>.+)'}],
                    destination: '/course/:subject/1',
                },
            ],
            afterFiles: [],
            fallback: [],
        }
    },
}

export default nextConfig
