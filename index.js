
const ALLOWED_DOMAINS = (process?.env?.ALLOWED_REMOTE_DOMAINS?.split(",") || ["*"]).map(d => d.trim());
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*'
}

Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname.startsWith("/image/")) return await resize(url);
        return new Response("OK");
    },
});

async function resize(url) {
    const preset = "pr:sharp"
    const src = url.pathname.split("/").slice(2).join("/");
    console.log('Resizing: ', src);
    const origin = new URL(src).hostname;

    const allowed = ALLOWED_DOMAINS.filter(domain => {
        if (domain === "*") return true;
        if (domain === origin) return true;
        return domain.startsWith("*.") && origin.endsWith(domain.split("*.").pop());
    })

    if (!allowed.length) {
        return new Response(`Domain (${origin}) not allowed. More details here: https://github.com/coollabsio/next-image-transformation`, {status: 403});
    }

    const width = url.searchParams.get("width") || 0;
    const height = url.searchParams.get("height") || 0;
    const quality = url.searchParams.get("quality") || 75;
    try {
        const url = `${process.env.IMGPROXY_URL}/${preset}/resize:fill:${width}:${height}/q:${quality}/plain/${src}`
        const image = await fetch(url, {
            headers: {
                "Accept": "image/avif,image/webp,image/apng,*/*",
                ...CORS_HEADERS,
            }
        })
        return new Response(image.body, {
            headers: {
                "Content-Type": image.headers.get("content-type"),
                ...CORS_HEADERS,
            }
        })
    } catch (e) {
        console.log(e)
        return new Response("Error resizing image")
    }
}