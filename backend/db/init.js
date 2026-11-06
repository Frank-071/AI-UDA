const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
async function main() {
  if (!process.env.DATABASE_URL || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) throw new Error('Configure DATABASE_URL, ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres).');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(fs.readFileSync(require('path').join(__dirname, 'schema.sql'), 'utf8'));
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    const result = await pool.query("INSERT INTO users(name,email,password_hash,role_id) SELECT $1,lower($2),$3,id FROM roles WHERE name='ADMIN' ON CONFLICT(email) DO NOTHING RETURNING id", [process.env.ADMIN_NAME || 'Administrador', process.env.ADMIN_EMAIL.trim(), hash]);
    console.log(result.rowCount ? 'Esquema listo y administrador creado.' : 'Esquema listo. El administrador ya existía; su contraseña no fue modificada.');
  } finally { await pool.end(); }
}
main().catch(e => { console.error(e.message); process.exit(1); });
