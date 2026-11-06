import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@backend/lib/db';
import { createSession, cookieOptions, sameOrigin } from '@backend/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Solicitud no autorizada' }, { status: 403 });
  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 255 || password.length > 256) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 400 });
    const { rows } = await db.query('SELECT u.id,u.password_hash FROM users u WHERE u.email=lower($1) AND u.active=TRUE', [email.trim()]);
    const valid = await bcrypt.compare(password, rows[0]?.password_hash || '$2a$12$C6UzMDM.H6dfI/f/IKcEe.1w/0nJHgBJi2UaLq3FXFz0uQ9nYH4K2');
    if (!rows[0] || !valid) return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
    const response = NextResponse.json({ ok: true }); response.cookies.set('workdoc_session', await createSession(rows[0]), cookieOptions); return response;
  } catch { return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 500 }); }
}
