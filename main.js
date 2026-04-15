const { program } = require('commander');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const superagent = require('superagent');

program
  .requiredOption('-h, --host <host>', 'host address')
  .requiredOption('-p, --port <port>', 'port number')
  .requiredOption('-c, --cache <path>', 'cache directory path');

program.parse();
const options = program.opts();

async function ensureCacheDir() {
  try {
    await fs.access(options.cache);
  } catch {
    await fs.mkdir(options.cache, { recursive: true });
  }
}

const server = http.createServer(async (req, res) => {
  const statusCode = req.url.slice(1);
  const filePath = path.join(options.cache, `${statusCode}.jpg`);

  try {
    switch (req.method) {
      case 'GET':
        try {
          const data = await fs.readFile(filePath);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(data);
        } catch (err) {
          try {
            console.log(`Кешу немає. Завантажую з http.cat для: ${statusCode}`);
            
            // Використовуємо buffer() ТА забираємо response.body
            const response = await superagent
              .get(`https://http.cat/${statusCode}`)
              .buffer(true); 

            const imageBuffer = response.body;

            // Перевірка: якщо прийшов не Buffer або він замалий
            if (!Buffer.isBuffer(imageBuffer)) {
              throw new Error('Отримані дані не є бінарним файлом');
            }

            await fs.writeFile(filePath, imageBuffer);
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(imageBuffer);
          } catch (fetchErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        }
        break;

      case 'PUT':
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', async () => {
          await fs.writeFile(filePath, Buffer.concat(body));
          res.writeHead(201);
          res.end('Created');
        });
        break;

      case 'DELETE':
        try {
          await fs.unlink(filePath);
          res.writeHead(200);
          res.end('Deleted');
        } catch {
          res.writeHead(404);
          res.end('Not Found');
        }
        break;

      default:
        res.writeHead(405);
        res.end('Method Not Allowed');
    }
  } catch (e) {
    res.writeHead(500);
    res.end('Internal Error');
  }
});

ensureCacheDir().then(() => {
  server.listen(options.port, options.host, () => {
    console.log(`Сервер: http://${options.host}:${options.port}`);
  });
});