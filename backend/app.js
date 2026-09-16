const express = require('express');
const path = require('node:path');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const googleRoutes = require('./routes/google');
const aiRoutes = require('./routes/ai');
const { publicDir } = require('./config');
const { requireSameOrigin } = require('./middleware');

const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://www.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://api.weatherapi.com https://open.er-api.com https://nominatim.openstreetmap.org https://pixabay.com; frame-src 'self' https://*.firebaseapp.com https://www.openstreetmap.org https://www.google.com https://maps.google.com; upgrade-insecure-requests");
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use('/api', requireSameOrigin);
app.use('/api', userRoutes);
app.use('/api', adminRoutes);
app.use('/api', googleRoutes);
app.use('/api', aiRoutes);
app.use(express.static(publicDir, { extensions: ['html'], index: false }));

app.use((error, req, res, next) => {
  console.error(process.env.NODE_ENV === 'production' ? error.message : error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Unable to process the request.' });
});

module.exports = app;
