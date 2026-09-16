function buildPlannerPrompt(input) {
  const {
    from, to, startDate, endDate, travelers, days, budget, preferences,
    eco, family, meal, special, transportMode, planLanguage
  } = input;
  const transportLabels = { air: 'Air (flight)', bus: 'Bus (coach)', train: 'Train' };
  const transportLabel = transportLabels[transportMode] || transportLabels.air;
  const languageInstruction = planLanguage && planLanguage.toLowerCase() !== 'english'
    ? `\n\nLANGUAGE REQUIREMENT: Write every human-readable text value in the JSON (trip name, descriptions, tips, activity names, notes - everything except the JSON keys themselves, numbers, dates, and URLs) entirely in ${planLanguage}. Do not mix in English. Keep currency figures in BDT with normal digits.\n`
    : '';
  const dateRange = `${startDate} to ${endDate}`;

  return `You are an AI super travel planner. Plan a trip from ${from} to ${to} for ${travelers} travelers for ${days} days, from ${startDate} to ${endDate}. Preferences: ${preferences}. Budget: ${budget}. Eco-friendly: ${eco}. Family-friendly: ${family}. Meal: ${meal}. Special requests: ${special}. The traveler's chosen main transport mode for this journey is: ${transportLabel}.${languageInstruction}

Generate the travel plan STRICTLY as a single JSON object. Do not include markdown or any information outside the JSON object.

All cost fields MUST be represented in BDT (Bangladeshi Taka).

Rules:
1. Every itinerary field (activity, timing, entry_fee, transport type, transport cost, transport pickup) must have a realistic specific value. Do not use N/A, TBD, Generic, or empty strings.
2. The conceptual transport plan must include common Air, Train, and Bus options between ${from} and ${to}, with estimated return-trip costs for ${travelers} travelers. Its cost_estimate must be a clean BDT string.
3. The first morning slot on Day 1 must clearly list Air, Train, and Bus timing/cost guidance and refer to the conceptual transport plan.
4. Links must be direct valid Google Maps URLs starting with https://www.google.com/maps/ or direct booking links. Never use placeholder URLs. Use a descriptive search URL if needed.
5. For short-distance transport, use appropriate modes such as Rickshaw, CNG, Taxi, or Local Bus with realistic costs.
6. Produce exactly 3 realistic ${transportMode} ticket options for ${from} to ${to}, sorted cheapest to most expensive, one-way, in BDT.

Return exactly these 13 top-level keys:
1. trip_name (string)
2. duration (string)
3. weather_forecast (string for ${dateRange})
4. estimated_total_cost (object with summary string and details object containing Hotel, Food, Transport, Sightseeing)
5. best_time_to_visit (string)
6. safety_health_tips (array of 3-5 specific strings)
7. packing_list (array of 5-7 strings)
8. top_attractions_suggestions (array of 3-5 objects with name, description, google_maps_link)
9. photo_spots (array of 3 objects with name, description, google_maps_link)
10. conceptual_transport_plan (object with route string and cost_estimate string in BDT)
11. hotel_suggestions (array of 3 objects with name, location, rating, price_range, booking_link)
12. itinerary (object with day_1, day_2, etc.; each day has morning, afternoon, evening slots)
13. ticket_options (array of exactly 3 objects with tier, operator, price, note, sorted cheapest to most expensive)

Start directly with the opening curly brace of the JSON object.`;
}

module.exports = { buildPlannerPrompt };
