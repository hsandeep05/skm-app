const http = require('http');

// Lightweight reverse proxy that rewrites Host header before forwarding to Next.js
// This fixes the issue where Caddy forwards an external Host header that crashes Next.js
const TARGET_PORT = 3001;
const LISTEN_PORT = 3000;

const server = http.createServer((clientReq, clientRes) => {
  const headers = {};
  
  for (const [key, value] of Object.entries(clientReq.headers)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'host') {
      headers['x-forwarded-host'] = value;
      headers['host'] = `localhost:${TARGET_PORT}`;
    } else if (lowerKey === 'origin') {
      // Skip Origin header to prevent CORS issues
    } else {
      headers[key] = value;
    }
  }

  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Proxy] Error:', err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    }
    clientRes.end(JSON.stringify({ error: 'Bad Gateway' }));
  });

  clientReq.on('error', (err) => {
    console.error('[Proxy] Client error:', err.message);
    proxyReq.destroy();
  });

  clientReq.pipe(proxyReq, { end: true });
});

server.listen(LISTEN_PORT, () => {
  console.log(`[Proxy] Listening on port ${LISTEN_PORT}, forwarding to Next.js on port ${TARGET_PORT}`);
});
