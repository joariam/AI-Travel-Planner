const express = require('express');
const path = require('node:path');
const { adminEmail, adminPassword, dataDir } = require('../config');
const { readJson } = require('../storage');
const { createSession, removeSession, safeEqualText } = require('../auth');
const { requireSession, setSessionCookie, clearSessionCookie, rateLimit } = require('../middleware');

const router = express.Router();
const tripsFile = path.join(dataDir, 'trips.json');
const usersFile = path.join(dataDir, 'users.json');
const activityFile = path.join(dataDir, 'activity.json');

router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!adminPassword) return res.status(503).json({ error: 'Admin authentication is not configured on the server.' });
  if (!safeEqualText(email, adminEmail) || !safeEqualText(password, adminPassword)) return res.status(401).json({ error: 'Invalid email or password.' });
  setSessionCookie(res, 'local_admin_session', createSession(email, 'admin'));
  res.json({ email });
});

router.post('/logout', (req, res) => {
  removeSession(req, 'local_admin_session');
  clearSessionCookie(res, 'local_admin_session');
  res.status(204).end();
});

router.get('/me', requireSession, (req, res) => res.json({ email: req.session.email }));

router.get('/trips', requireSession, async (req, res, next) => {
  try { res.json(await readJson(tripsFile, [])); } catch (error) { next(error); }
});

router.get('/users', requireSession, async (req, res, next) => {
  try {
    const users = await readJson(usersFile, []);
    res.json(users.map(({ passwordHash, ...user }) => user));
  } catch (error) { next(error); }
});

router.get('/admin/preview/:uid', requireSession, async (req, res, next) => {
  try {
    const users = await readJson(usersFile, []);
    const user = users.find(item => item.uid === req.params.uid);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const [trips, activities] = await Promise.all([readJson(tripsFile, []), readJson(activityFile, [])]);
    const { passwordHash, ...publicUser } = user;
    res.json({
      user: publicUser,
      trips: trips.filter(trip => trip.userId === user.uid),
      activities: activities.filter(activity => activity.userId === user.uid)
    });
  } catch (error) { next(error); }
});

router.get('/activity', requireSession, async (req, res, next) => {
  try { res.json(await readJson(activityFile, [])); } catch (error) { next(error); }
});

module.exports = router;
