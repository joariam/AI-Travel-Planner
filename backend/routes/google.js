const express = require('express');
const crypto = require('node:crypto');
const { googleClientId, googleClientSecret, googleRedirectUri } = require('../config');
const { readJson, writeJson } = require('../storage');
const { createSession } = require('../auth');
const { setSessionCookie } = require('../middleware');
const path = require('node:path');
const { dataDir } = require('../config');

const router = express.Router();
const usersFile = path.join(dataDir, 'users.json');

router.get('/auth/google', (req, res) => {
  const redirectUri = googleRedirectUri || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
  if (!googleClientId) return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
  const params = new URLSearchParams({
    client_id: googleClientId, redirect_uri: redirectUri, response_type: 'code',
    scope: 'openid email profile', access_type: 'online', prompt: 'select_account'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/auth/google/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code || '');
    const redirectUri = googleRedirectUri || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    if (!code || !googleClientId || !googleClientSecret) return res.status(400).send('Google sign-in configuration is incomplete.');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: googleClientId, client_secret: googleClientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
    });
    if (!tokenResponse.ok) return res.status(502).send('Google sign-in token exchange failed.');
    const { access_token: accessToken } = await tokenResponse.json();
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!profileResponse.ok) return res.status(502).send('Google profile lookup failed.');
    const profile = await profileResponse.json();
    if (!profile.email || profile.email_verified === false) return res.status(400).send('Google did not provide a verified email address.');
    const users = await readJson(usersFile, []);
    let user = users.find(item => item.email === String(profile.email).toLowerCase());
    if (!user) {
      user = { uid: crypto.randomUUID(), name: profile.name || profile.email.split('@')[0], email: String(profile.email).toLowerCase(), photoURL: profile.picture || '', provider: 'google', createdAt: new Date().toISOString() };
      users.push(user);
      await writeJson(usersFile, users);
    }
    setSessionCookie(res, 'local_user_session', createSession(user.email, 'user', user));
    res.redirect('/planner.html');
  } catch (error) { next(error); }
});

module.exports = router;
