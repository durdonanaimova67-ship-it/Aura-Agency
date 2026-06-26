const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// When a file isn't in the local mirror, fetch it once from the live site,
// save it to disk (so the mirror becomes self-contained over time), then serve
// it. This keeps Gatsby's lazily-loaded chunks / page-data working offline after
// the first visit. Set MIRROR_FALLBACK=0 to disable.
const LIVE_ORIGIN = 'https://www.klientboost.com';
const FALLBACK = process.env.MIRROR_FALLBACK !== '0';

// The homepage lives under www.klientboost.com and requests its assets at
// absolute paths like "/styles.css", "/static/...", "/page-data/...".
// So we serve that folder as the web root, and fall back to the mirror root
// for cross-site links (../klientboost.com/...).
const SITE_ROOT = path.join(__dirname, 'klientboost-site');
const ROOT = path.join(SITE_ROOT, 'www.klientboost.com');
const PORT = process.env.PORT || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  // video / audio — .mov is mapped to video/mp4 so H.264 .MOV files play in Chrome/Edge/Firefox
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
};

// Serve a file, honoring HTTP Range requests (required for <video> playback/seeking).
const serveFile = (filePath, stat, req, res) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = TYPES[ext] || 'application/octet-stream';
  const total = stat.size;
  const range = req.headers.range;

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    if (isNaN(start) || start < 0) start = 0;
    if (isNaN(end) || end >= total) end = total - 1;
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': total,
    'Accept-Ranges': 'bytes',
  });
  fs.createReadStream(filePath).pipe(res);
};

// Fetch a missing resource from the live site, cache it to disk under the web
// root, then serve it. `rawUrl` keeps the original query string; `urlPath` is the
// decoded path used for the on-disk location.
const fetchFromLive = (rawUrl, urlPath, req, res) => {
  const liveUrl = LIVE_ORIGIN + rawUrl;
  https
    .get(
      liveUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: '*/*',
        },
      },
      (live) => {
        if (live.statusCode !== 200) {
          live.resume();
          res.writeHead(live.statusCode || 404, { 'Content-Type': 'text/plain' });
          res.end('404 (live ' + live.statusCode + '): ' + urlPath);
          return;
        }
        const chunks = [];
        live.on('data', (c) => chunks.push(c));
        live.on('end', () => {
          const body = Buffer.concat(chunks);
          // Save into the served root so the next request is local.
          const dest = path.join(ROOT, urlPath);
          fs.mkdir(path.dirname(dest), { recursive: true }, () => {
            fs.writeFile(dest, body, () => {});
          });
          const ext = path.extname(urlPath).toLowerCase();
          const contentType =
            TYPES[ext] || live.headers['content-type'] || 'application/octet-stream';
          console.log(`  ↳ fetched from live: ${urlPath} (${body.length}B)`);
          res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': body.length });
          res.end(body);
        });
      }
    )
    .on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('502 live fetch failed: ' + e.message);
    });
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // Try the site root (www.klientboost.com) first, then the mirror root.
  const candidates = [path.join(ROOT, urlPath), path.join(SITE_ROOT, urlPath)];

  const tryServe = (i) => {
    if (i >= candidates.length) {
      if (FALLBACK && req.method === 'GET') return fetchFromLive(req.url, urlPath, req, res);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    let filePath = candidates[i];
    fs.stat(filePath, (err, stat) => {
      if (err) return tryServe(i + 1);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        return fs.stat(filePath, (err2, stat2) => {
          if (err2) return tryServe(i + 1);
          serveFile(filePath, stat2, req, res);
        });
      }
      serveFile(filePath, stat, req, res);
    });
  };

  tryServe(0);
});

server.listen(PORT, () => {
  console.log(`Serving klientboost-site at http://localhost:${PORT}/`);
});
