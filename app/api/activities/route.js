import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { currentUser, sameOrigin } from '../../../lib/auth';
export const dynamic = 'force-dynamic';
const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d+'T00:00:00Z')) && new Date(d+'T00:00:00Z').toISOString().slice(0,10) === d;
export async function GET(request) {
 const user=await currentUser(); if(!user || user.role!=='USER') return NextResponse.json({error:'No autorizado'},{status:403});
 const date=new URL(request.url).searchParams.get('date'); if(!validDate(date)) return NextResponse.json({error:'Fecha inválida'},{status:400});
 const {rows}=await db.query("SELECT id,title,description,priority,status FROM activities WHERE user_id=$1 AND activity_date=$2 ORDER BY id",[user.id,date]); return NextResponse.json(rows);
}
export async function PUT(request) {
 const user=await currentUser(); if(!user || user.role!=='USER' || !sameOrigin(request)) return NextResponse.json({error:'No autorizado'},{status:403});
 let body; try { body=await request.json(); } catch { return NextResponse.json({error:'Datos inválidos'},{status:400}); }
 const {date,activities}=body;
 if(!validDate(date) || !Array.isArray(activities) || activities.length>100 || activities.some(a=>!a || typeof a.title!=='string' || !a.title.trim() || a.title.length>200 || typeof a.description!=='string' || a.description.length>5000 || !['HIGH','MEDIUM','LOW'].includes(a.priority) || !['PENDING','IN_PROGRESS','COMPLETED'].includes(a.status))) return NextResponse.json({error:'Revisa las actividades y la fecha.'},{status:400});
 const client=await db.connect(); try { await client.query('BEGIN'); await client.query('DELETE FROM activities WHERE user_id=$1 AND activity_date=$2',[user.id,date]); for(const a of activities) await client.query('INSERT INTO activities(user_id,activity_date,title,description,priority,status) VALUES($1,$2,$3,$4,$5,$6)',[user.id,date,a.title.trim(),a.description,a.priority,a.status]); await client.query('COMMIT'); return NextResponse.json({ok:true}); } catch { await client.query('ROLLBACK'); return NextResponse.json({error:'No se pudo guardar la jornada'},{status:500}); } finally {client.release();}
}
