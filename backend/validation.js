function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function text(value, maxLength = 200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateTripPayload(payload) {
  if (!isPlainObject(payload)) return { error: 'Trip data must be an object.' };
  if (!isPlainObject(payload.tripData)) return { error: 'A generated trip plan is required.' };
  if (!Array.isArray(payload.weatherData) || payload.weatherData.length > 31) {
    return { error: 'Weather data is invalid.' };
  }
  if (!isPlainObject(payload.meta)) return { error: 'Trip metadata is invalid.' };

  const tripSize = Buffer.byteLength(JSON.stringify(payload.tripData), 'utf8');
  const weatherSize = Buffer.byteLength(JSON.stringify(payload.weatherData), 'utf8');
  if (tripSize > 600 * 1024 || weatherSize > 100 * 1024) {
    return { error: 'Trip data is too large.' };
  }

  const meta = {
    from: text(payload.meta.from, 120),
    to: text(payload.meta.to, 120),
    startDate: text(payload.meta.startDate, 10),
    endDate: text(payload.meta.endDate, 10),
    travelers: text(payload.meta.travelers, 3),
    budget: text(payload.meta.budget, 120)
  };
  if (meta.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(meta.startDate)) return { error: 'Start date is invalid.' };
  if (meta.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(meta.endDate)) return { error: 'End date is invalid.' };

  return { value: { tripData: payload.tripData, weatherData: payload.weatherData, meta, destination: text(payload.destination, 120) || meta.to || 'Unknown' } };
}

function validateActivityPayload(payload) {
  if (!isPlainObject(payload)) return { error: 'Activity data is invalid.' };
  const type = text(payload.type, 80);
  if (!type) return { error: 'Activity type is required.' };
  const details = isPlainObject(payload.details) ? payload.details : {};
  if (Buffer.byteLength(JSON.stringify(details), 'utf8') > 8000) return { error: 'Activity details are too large.' };
  return { value: { type, planId: text(payload.planId, 80) || null, details } };
}

function validatePlannerInput(payload) {
  if (!isPlainObject(payload)) return { error: 'Planner input is invalid.' };
  const value = {
    from: text(payload.from, 120),
    to: text(payload.to, 120),
    startDate: text(payload.startDate, 10),
    endDate: text(payload.endDate, 10),
    travelers: text(payload.travelers, 3),
    days: text(payload.days, 3),
    budget: text(payload.budget, 120),
    preferences: text(payload.preferences, 300),
    eco: Boolean(payload.eco),
    family: Boolean(payload.family),
    meal: text(payload.meal, 120),
    special: text(payload.special, 300),
    transportMode: ['air', 'bus', 'train'].includes(payload.transportMode) ? payload.transportMode : 'air',
    planLanguage: text(payload.planLanguage, 60) || 'English'
  };
  if (!value.from || !value.to || !/^\d{4}-\d{2}-\d{2}$/.test(value.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(value.endDate)) {
    return { error: 'Valid route and dates are required.' };
  }
  if (!/^\d{1,2}$/.test(value.travelers) || !/^\d{1,2}$/.test(value.days)) return { error: 'Traveler and day counts are invalid.' };
  if (Number(value.travelers) < 1 || Number(value.travelers) > 20 || Number(value.days) < 1 || Number(value.days) > 30) return { error: 'Traveler and day counts are out of range.' };
  return { value };
}

module.exports = { isEmail, text, validateTripPayload, validateActivityPayload, validatePlannerInput };
