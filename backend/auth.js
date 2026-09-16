const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { sessionTtlMs } = require('./config');

const scrypt = promisify(crypto.scrypt);
const sessions = new Map();

function createSession(email, role, user = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    email,
    role,
    name: user.name,
    uid: user.uid,
    expiresAt: Date.now() + sessionTtlMs
  });
  return token;
}

function readCookie(req, name) {
  return req.headers.cookie?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
}

function getSession(req, cookieName) {
  const token = readCookie(req, cookieName);
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function removeSession(req, cookieName) {
  const token = readCookie(req, cookieName);
  if (token) sessions.delete(token);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false;
  if (storedHash.startsWith('scrypt$')) {
    const [, salt, expectedHex] = storedHash.split('$');
    if (!salt || !expectedHex) return false;
    const actual = await scrypt(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
  }
  const expected = Buffer.from(storedHash);
  const actual = Buffer.from(crypto.createHash('sha256').update(password).digest('hex'));
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  createSession,
  getSession,
  removeSession,
  hashPassword,
  verifyPassword,
  safeEqualText
};
