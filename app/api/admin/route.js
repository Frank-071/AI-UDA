import { NextResponse } from 'next/server';
import { currentUser } from '../../../lib/auth';
import { db } from '../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(request) {
 const user=await currentUser(); if(!user || user.role!=='ADMIN') return NextResponse.json({error:'No autorizado'},{status:403});
 const params=new URL(request.url).searchParams; const from=params.get('from'), to=params.get('to');
 const valid=d=>typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d+'T00:00:00Z')) && new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 if(!valid(from)||!valid(to)||from>to) return NextResponse.json({error:'Rango de fechas inválido'},{status:400});
 const [summary, daily, users]=await Promise.all([
 db.query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='COMPLETED')::int completed, COUNT(*) FILTER (WHERE status='IN_PROGRESS')::int in_progress, COUNT(DISTINCT user_id)::int contributors FROM activities WHERE activity_date BETWEEN $1 AND $2",[from,to]),
 db.query("SELECT to_char(activity_date,'YYYY-MM-DD') date, COUNT(*)::int total, COUNT(*) FILTER (WHERE status='COMPLETED')::int completed FROM activities WHERE activity_date BETWEEN $1 AND $2 GROUP BY activity_date ORDER BY activity_date",[from,to]),
 db.query("SELECT u.id,u.name,u.email,u.active,r.name role, COUNT(a.id)::int total, COUNT(a.id) FILTER (WHERE a.status='COMPLETED')::int completed FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN activities a ON a.user_id=u.id AND a.activity_date BETWEEN $1 AND $2 GROUP BY u.id,r.name ORDER BY u.name",[from,to])]);
 return NextResponse.json({summary:summary.rows[0],daily:daily.rows,users:users.rows});
}
