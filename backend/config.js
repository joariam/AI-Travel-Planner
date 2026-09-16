const path = require('node:path');
const fs = require('node:fs');

const rootDir = path.join(__dirname, '..');
const sourcePublicDir = path.join(rootDir, 'public');
const distPublicDir = path.join(rootDir, 'dist');

module.exports = {
  rootDir,
  publicDir: process.env.PUBLIC_DIR
    ? path.resolve(rootDir, process.env.PUBLIC_DIR)
    : (process.env.NODE_ENV === 'production' && fs.existsSync(distPublicDir) ? distPublicDir : sourcePublicDir),
  dataDir: path.join(rootDir, 'data'),
  port: Number(process.env.PORT || 3000),
  adminEmail: (process.env.ADMIN_EMAIL || 'demo-admin@local.test').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  sessionTtlMs: 8 * 60 * 60 * 1000,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  pixabayApiKey: process.env.PIXABAY_API_KEY || ''
};
