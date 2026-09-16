const express = require('express');
const { geminiApiKey, weatherApiKey, claudeApiKey, pixabayApiKey } = require('../config');
const { requireSession, requireUser, rateLimit } = require('../middleware');
const { validatePlannerInput } = require('../validation');
const { buildPlannerPrompt } = require('../planner-prompt');

const router = express.Router();

router.post('/ai/generate', requireUser, rateLimit({ windowMs: 60 * 1000, max: 10 }), async (req, res, next) => {
  try {
    if (!geminiApiKey) return res.status(503).json({ error: 'AI generation is not configured on the server.' });
    const validated = validatePlannerInput(req.body?.planner);
    if (validated.error) return res.status(400).json({ error: validated.error });
    const prompt = buildPlannerPrompt(validated.value);
    if (!prompt) return res.status(400).json({ error: 'A prompt is required.' });
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': geminiApiKey },
      body: JSON.stringify({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: 'The AI provider rejected the request.' });
    res.json(data);
  } catch (error) { next(error); }
});

router.post('/ai/translate', rateLimit({ windowMs: 60 * 1000, max: 10 }), async (req, res, next) => {
  try {
    if (!geminiApiKey) return res.status(503).json({ error: 'Translation is not configured on the server.' });
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 20000) : '';
    if (!prompt) return res.status(400).json({ error: 'Translation content is required.' });
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': geminiApiKey },
      body: JSON.stringify({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: 'The translation provider rejected the request.' });
    res.json(data);
  } catch (error) { next(error); }
});

router.post('/weather', requireUser, rateLimit({ windowMs: 60 * 1000, max: 30 }), async (req, res, next) => {
  try {
    if (!weatherApiKey) return res.status(503).json({ error: 'Weather lookup is not configured on the server.' });
    const location = typeof req.body?.location === 'string' ? req.body.location.trim().slice(0, 200) : '';
    const date = typeof req.body?.date === 'string' ? req.body.date : '';
    if (!location || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'A valid location and date are required.' });
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(weatherApiKey)}&q=${encodeURIComponent(location)}&days=1&dt=${encodeURIComponent(date)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: 'The weather provider rejected the request.' });
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/place-image', rateLimit({ windowMs: 60 * 1000, max: 30 }), async (req, res, next) => {
  try {
    if (!pixabayApiKey) return res.status(503).json({ error: 'Photo search is not configured.' });
    const query = typeof req.query.query === 'string' ? req.query.query.trim().slice(0, 200) : '';
    if (!query) return res.status(400).json({ error: 'A photo search query is required.' });
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(pixabayApiKey)}&q=${encodeURIComponent(query)}&image_type=photo&category=travel&safesearch=true&per_page=3`;
    const response = await fetch(url);
    if (!response.ok) return res.status(502).json({ error: 'The photo provider rejected the request.' });
    const data = await response.json();
    const hit = data.hits?.[0];
    res.json({ imageUrl: hit?.webformatURL || hit?.largeImageURL || null });
  } catch (error) { next(error); }
});

router.post('/admin/ai/chat', requireSession, rateLimit({ windowMs: 60 * 1000, max: 20 }), async (req, res, next) => {
  try {
    if (!claudeApiKey) return res.status(503).json({ error: 'Admin AI assistant is not configured on the server.' });
    const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-20) : [];
    if (!messages.length) return res.status(400).json({ error: 'At least one message is required.' });
    if (messages.some(message => !message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || message.content.length > 8000)) {
      return res.status(400).json({ error: 'Messages must contain valid user or assistant text.' });
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': claudeApiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: 'You are a coding assistant helping the owner-admin maintain the AI Travel Planner. Give concrete, concise implementation guidance.',
        messages
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: 'The admin AI provider rejected the request.' });
    res.json(data);
  } catch (error) { next(error); }
});

module.exports = router;
