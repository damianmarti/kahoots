// Crea el primer usuario admin.
// Uso: node scripts/seed-admin.js <username> <password>
//   o con env vars: ADMIN_USERNAME=... ADMIN_PASSWORD=... node scripts/seed-admin.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Carga .env.local a mano (sin depender de next)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const username = process.argv[2] || process.env.ADMIN_USERNAME;
const password = process.argv[3] || process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error('Uso: node scripts/seed-admin.js <username> <password>');
  process.exit(1);
}

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [username, hash]
  );
  console.log(`Admin "${username}" listo (id ${rows[0].id}).`);
  await pool.end();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
