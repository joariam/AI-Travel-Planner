const app = require('./backend/app');
const { port, adminEmail } = require('./backend/config');

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD must be configured before starting in production.');
}

app.listen(port, () => {
  console.log(`Local planner server: http://localhost:${port}/planner.html`);
  console.log(`Admin email: ${adminEmail}`);
  if (!process.env.ADMIN_PASSWORD) console.log('Admin authentication is disabled until ADMIN_PASSWORD is configured.');
});
