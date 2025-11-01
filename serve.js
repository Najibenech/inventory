// Simple static file server (no dependencies)
// Usage: node serve.js [port]

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const port = parseInt(process.argv[2] || process.env.PORT || '8000', 10);

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

function send404(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('404 Not Found');
}

function safeJoin(base, target) {
  const targetPath = '.' + path.normalize('/' + target);
  return path.resolve(base, targetPath);
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURI(req.url.split('?')[0]);
    let fsPath = safeJoin(root, urlPath);

    if (!fsPath.startsWith(root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    let stat;
    try { stat = fs.statSync(fsPath); } catch (e) { stat = null; }

    if (!stat) {
      // try with index.html in the requested folder
      if (fsPath.endsWith('/')) fsPath = path.join(fsPath, 'index.html');
      else fsPath = fsPath + '.html';
    }

    try { stat = fs.statSync(fsPath); } catch (e) { stat = null; }
    if (!stat) {
      send404(res);
      return;
    }

    if (stat.isDirectory()) {
      const index = path.join(fsPath, 'index.html');
      if (fs.existsSync(index)) {
        fsPath = index;
      } else {
        // list directory
        const items = fs.readdirSync(fsPath);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<h1>Directory listing</h1><ul>' + items.map(i => '<li><a href="' + path.posix.join(req.url, i) + '">' + i + '</a></li>').join('') + '</ul>');
        return;
      }
    }

    const ext = path.extname(fsPath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', type + (type.startsWith('text/') || type === 'application/javascript' ? '; charset=utf-8' : ''));

    const stream = fs.createReadStream(fsPath);
    res.statusCode = 200;
    stream.pipe(res);
    stream.on('error', () => send404(res));
  } catch (err) {
    res.statusCode = 500;
    res.end('Server error');
  }
});

server.listen(port, () => {
  console.log('Serving', root, 'on http://localhost:' + port);
});
