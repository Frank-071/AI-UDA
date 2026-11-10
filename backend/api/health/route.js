import { NextResponse } from 'next/server';
import { db } from '@backend/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.query('SELECT 1');
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('GET /api/health:', error);
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
