const { program } = require('commander');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

// --- ЧАСТИНА 1: Параметри командного рядка ---
program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії з кешем');

program.parse();
const options = program.opts();

async function ensureCacheDir() {
  try {
    await fs.access(options.cache);
  } catch {
    await fs.mkdir(options.cache, { recursive: true });
    console.log(`Директорію кешу створено: ${options.cache}`);
  }
}

// --- ЧАСТИНА 2: Обробка запитів (GET, PUT, DELETE) ---
const server = http.createServer(async (req, res) => {
  const statusCode = req.url.slice(1); // Витягуємо код, наприклад '200'
  const filePath = path.join(options.cache, `${statusCode}.jpg`);

  try {
    switch (req.method) {
      case 'GET':
        try {
          const data = await fs.readFile(filePath);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(data);
        } catch (err) {
          res.writeHead(404);
          res.end('Not Found');
        }
        break;

      case 'PUT':
        let body = [];
        req.on('data', (chunk) => body.push(chunk));
        req.on('end', async () => {
          try {
            await fs.writeFile(filePath, Buffer.concat(body));
            res.writeHead(201);
            res.end('Created');
          } catch (err) {
            res.writeHead(500);
            res.end('Internal Server Error');
          }
        });
        break;

      case 'DELETE':
        try {
          await fs.unlink(filePath);
          res.writeHead(200);
          res.end('Deleted');
        } catch (err) {
          res.writeHead(404);
          res.end('Not Found');
        }
        break;

      default:
        res.writeHead(405);
        res.end('Method Not Allowed');
        break;
    }
  } catch (globalError) {
    res.writeHead(500);
    res.end('Server Error');
  }
});


async function start() {
  try {
    await ensureCacheDir();
    server.listen(options.port, options.host, () => {
      console.log(`Сервер працює за адресою http://${options.host}:${options.port}`);
      console.log(`Кеш зберігається у: ${path.resolve(options.cache)}`);
    });
  } catch (err) {
    console.error('Помилка запуску:', err.message);
    process.exit(1);
  }
}

start();