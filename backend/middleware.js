const { getSession } = require('./auth');
const buckets = new Map();

function requireSession(req, res, next) {
  const session = getSession(req, 'local_admin_session');
  if (!session || session.role !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  req.session = session;
  next();
}

function requireUser(req, res, next) {
  const session = getSession(req, 'local_user_session');
  if (!session || session.role !== 'user') {
    return res.status(401).json({ error: 'User authentication required.' });
  }
  req.session = session;
  next();
}

function setSessionCookie(res, name, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${name}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`);
}

function clearSessionCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next();

  const expectedOrigin = `${req.protocol}://${req.get('host')}`;
  if (origin !== expectedOrigin) {
    return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
  }
  next();
}

function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (current.count >= max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    current.count += 1;
    next();
  };
}

module.exports = { requireSession, requireUser, setSessionCookie, clearSessionCookie, requireSameOrigin, rateLimit };
