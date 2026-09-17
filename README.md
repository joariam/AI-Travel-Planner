# AI Travel Planner

## Architecture

- `public/`: browser-delivered planner and admin pages only.
- `backend/`: server-only configuration, authentication, storage, middleware, and route modules.
- `data/`: local server data files; never served as static files.
- `server.js`: minimal production entrypoint.

The browser calls same-origin `/api/*` endpoints. Gemini, WeatherAPI, Google OAuth token exchange, and Claude calls are server-side only. Provider credentials are read from environment variables and are never returned to the browser.

## Run locally

1. Copy the variable names from `.env.example` into your process manager or shell environment.
2. Set a strong `ADMIN_PASSWORD`.
3. Set `GEMINI_API_KEY`, `WEATHER_API_KEY`, and `CLAUDE_API_KEY` if those features are enabled.
4. Run `npm install` and `npm start`.
5. Open `http://localhost:3000/planner.html`.

For a production frontend build, run `npm run build` before `npm start`. This writes minified `planner.html` and `admin.html` to the ignored `dist/` directory. In production, the server uses `dist/` automatically when it exists; no source maps are generated.

This project does not load `.env` automatically. Use your hosting platform's secret/environment configuration, or load variables in the shell before starting Node.

## Production deployment

Run the Node process as a non-root service behind an HTTPS reverse proxy. Publish only the application port through the proxy, keep `data/` and the project directory outside the web server's static root, and configure `NODE_ENV=production`. Keep the Git repository private and deploy through a trusted CI/CD runner or private server checkout.

Rotate any provider credentials that were previously present in browser code or committed history. Removing a credential from the working tree does not revoke it or remove it from Git history.

## GitHub Pages demo

The repository includes a GitHub Actions workflow that publishes `public/` as a static GitHub Pages demo after pushes to `main`. Once GitHub Pages is enabled with **GitHub Actions** as its source, the repository site will open `planner.html` at its root URL.

GitHub Pages cannot run the Node/Express server. The published demo can show the planner interface, but login, saved trips, server-side AI generation, weather proxying, and admin routes require the full application to be deployed on a Node-compatible host with the required environment variables.
