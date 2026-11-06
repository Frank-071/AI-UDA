import { NextResponse } from 'next/server';
import { currentUser, sameOrigin } from '@backend/lib/auth';
import { db } from '@backend/lib/db';
export async function PATCH(request,{params}) {
 const user=await currentUser(); if(!user || user.role!=='ADMIN' || !sameOrigin(request)) return NextResponse.json({error:'No autorizado'},{status:403});
 const id=Number(params.id); let body; try {body=await request.json();} catch{return NextResponse.json({error:'Datos inválidos'},{status:400});}
 if(!Number.isSafeInteger(id)||id<1||typeof body.active!=='boolean'||id===user.id) return NextResponse.json({error:'No puedes cambiar tu propia cuenta o los datos son inválidos'},{status:400});
 const result=await db.query('UPDATE users SET active=$1 WHERE id=$2 RETURNING id',[body.active,id]); return result.rowCount?NextResponse.json({ok:true}):NextResponse.json({error:'Usuario no encontrado'},{status:404});
}
