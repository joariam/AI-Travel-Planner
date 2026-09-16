const crypto = require('node:crypto');
const express = require('express');
const { dataDir } = require('../config');
const { readJson, writeJson } = require('../storage');
const { createSession, hashPassword, verifyPassword } = require('../auth');
const { requireUser, setSessionCookie, clearSessionCookie, rateLimit } = require('../middleware');
const { isEmail, text, validateTripPayload, validateActivityPayload } = require('../validation');

const router = express.Router();
const usersFile = require('node:path').join(dataDir, 'users.json');
const tripsFile = require('node:path').join(dataDir, 'trips.json');
const activityFile = require('node:path').join(dataDir, 'activity.json');

function publicUser(user) {
  return { uid: user.uid, email: user.email, name: user.name, photoURL: user.photoURL };
}

router.post('/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res, next) => {
  try {
    const name = text(req.body?.name, 120);
    const email = text(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!name || !isEmail(email) || password.length < 6) {
      return res.status(400).json({ error: 'A valid name and email, plus a password of at least 6 characters, are required.' });
    }
    const users = await readJson(usersFile, []);
    if (users.some(user => user.email === email)) return res.status(409).json({ error: 'Email already exists.' });
    const user = { uid: crypto.randomUUID(), name, email, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
    users.push(user);
    await writeJson(usersFile, users);
    setSessionCookie(res, 'local_user_session', createSession(user.email, 'user', user));
    res.status(201).json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

router.post('/user-login', rateLimit({ windowMs: 15 * 60 * 1000, max: 15 }), async (req, res, next) => {
  try {
    const email = text(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const users = await readJson(usersFile, []);
    const user = users.find(item => item.email === email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!user.passwordHash.startsWith('scrypt$')) {
      user.passwordHash = await hashPassword(password);
      await writeJson(usersFile, users);
    }
    setSessionCookie(res, 'local_user_session', createSession(user.email, 'user', user));
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

router.post('/user-logout', (req, res) => {
  const { removeSession } = require('../auth');
  removeSession(req, 'local_user_session');
  clearSessionCookie(res, 'local_user_session');
  res.status(204).end();
});

router.get('/user-me', requireUser, (req, res) => {
  res.json({ uid: req.session.uid, email: req.session.email, name: req.session.name });
});

router.get('/user-trips', requireUser, async (req, res, next) => {
  try {
    const trips = await readJson(tripsFile, []);
    res.json(trips.filter(trip => trip.userId === req.session.uid));
  } catch (error) {
    next(error);
  }
});

router.post('/user-trips', requireUser, async (req, res, next) => {
  try {
    const validated = validateTripPayload(req.body);
    if (validated.error) return res.status(400).json({ error: validated.error });
    const trips = await readJson(tripsFile, []);
    const trip = {
      ...validated.value,
      id: crypto.randomUUID(),
      userId: req.session.uid,
      userEmail: req.session.email,
      userName: req.session.name,
      createdAt: new Date().toISOString()
    };
    trips.push(trip);
    await writeJson(tripsFile, trips);
    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
});

router.delete('/user-trips/:id', requireUser, async (req, res, next) => {
  try {
    const trips = await readJson(tripsFile, []);
    const remaining = trips.filter(trip => !(trip.id === req.params.id && trip.userId === req.session.uid));
    await writeJson(tripsFile, remaining);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post('/user-activity', requireUser, async (req, res, next) => {
  try {
    const validated = validateActivityPayload(req.body);
    if (validated.error) return res.status(400).json({ error: validated.error });
    const activities = await readJson(activityFile, []);
    const activity = {
      id: crypto.randomUUID(),
      userId: req.session.uid,
      userEmail: req.session.email,
      userName: req.session.name,
      planId: validated.value.planId,
      type: validated.value.type,
      details: validated.value.details,
      createdAt: new Date().toISOString()
    };
    activities.push(activity);
    await writeJson(activityFile, activities);
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
