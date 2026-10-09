// Cloudflare Worker for the game's paths of dionel.site (docs/deploy.md §9): /comicle*,
// /api/* and /socket.io/* go to the EC2 origin; every other path never reaches this Worker.
// The original Origin header is kept, so the app's CORS_ORIGINS stays https://dionel.site.

const ORIGIN_HOST = 'comicle-origin.dionel.site';

export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = ORIGIN_HOST;
    // Passing the request on keeps method, body and the WebSocket upgrade headers.
    return fetch(new Request(url, request));
  },
};
