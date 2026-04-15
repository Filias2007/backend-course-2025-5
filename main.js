const { program } = require('commander');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії з кешем');

program.parse();
const options = program.opts();

async function ensureCacheDir() {
  try {
    await fs.access(options.cache);
  } catch (error) {
    await fs.mkdir(options.cache, { recursive: true });
    console.log(`Директорію кешу створено за шляхом: ${options.cache}`);
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Проксі-сервер запущено.');
});

async function start() {
  try {
    await ensureCacheDir();

    server.listen(options.port, options.host, () => {
      console.log(`Сервер працює за адресою http://${options.host}:${options.port}`);
      console.log(`Папка кешу: ${path.resolve(options.cache)}`);
    });
  } catch (err) {
    console.error('Помилка при запуску сервера:', err.message);
    process.exit(1);
  }
}

start();