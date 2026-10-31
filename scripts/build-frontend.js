const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const apiBaseUrl = (process.env.API_BASE_URL || '').trim();

if (process.env.NETLIFY && !apiBaseUrl) {
  throw new Error('Configura API_BASE_URL en Netlify con la URL pública de la API de Render.');
}

if (apiBaseUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error('API_BASE_URL debe ser una URL válida que empiece por https://.');
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
    throw new Error('API_BASE_URL debe usar HTTPS en producción.');
  }
}

fs.mkdirSync(output, { recursive: true });

for (const file of ['index.html', 'nosotros.html', 'producto.html']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}

for (const directory of ['css', 'img', 'js']) {
  fs.cpSync(path.join(root, directory), path.join(output, directory), { recursive: true });
}

const configuredApiUrl = apiBaseUrl.replace(/\/+$/, '') || 'http://localhost:3000';
const configPath = path.join(output, 'js', 'config.js');
fs.writeFileSync(
  configPath,
  `window.FRONTEND_STORE_API_URL = ${JSON.stringify(configuredApiUrl)};\n`,
  'utf8'
);

console.log(`Frontend compilado en dist. API: ${configuredApiUrl}`);
