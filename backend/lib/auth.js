import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';
const key = () => { const secret = process.env.JWT_SECRET; if (!secret || secret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres'); return new TextEncoder().encode(secret); };
const secureCookies = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
export async function createSession(user) { return new SignJWT({ sub: String(user.id) }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(key()); }
export async function currentUser() {
  try {
    const token = cookies().get('workdoc_session')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    const { rows } = await db.query('SELECT u.id,u.name,u.email,r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 AND u.active=TRUE', [payload.sub]);
    return rows[0] || null;
  } catch { return null; }
}
export const cookieOptions = { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 };
export const expiredCookieOptions = { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/', maxAge: 0 };
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
    const requestHost = forwardedHost || request.headers.get('host');
    if (!requestHost || originUrl.host !== requestHost) return false;
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
    return !forwardedProto || originUrl.protocol === `${forwardedProto}:`;
  } catch {
    return false;
  }
}
