import { NextResponse } from 'next/server';
import { expiredCookieOptions, sameOrigin } from '@backend/lib/auth';
export async function POST(request) { if (!sameOrigin(request)) return NextResponse.json({error:'Solicitud no autorizada'}, {status:403}); const response = NextResponse.json({ok:true}); response.cookies.set('workdoc_session','',expiredCookieOptions); return response; }
