import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { currentUser, sameOrigin } from '@backend/lib/auth';
import { db } from '@backend/lib/db';
export async function POST(request) {
 const user=await currentUser(); if(!user || user.role!=='ADMIN' || !sameOrigin(request)) return NextResponse.json({error:'No autorizado'},{status:403});
 try { const {name,email,password,role}=await request.json(); if(typeof name!=='string'||!name.trim()||name.length>100||typeof email!=='string'||email.length>255||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||typeof password!=='string'||password.length<12||password.length>72||!['ADMIN','USER'].includes(role)) return NextResponse.json({error:'Completa los datos; la contraseña debe tener entre 12 y 72 caracteres.'},{status:400});
 const hash=await bcrypt.hash(password,12); await db.query('INSERT INTO users(name,email,password_hash,role_id) SELECT $1,lower($2),$3,id FROM roles WHERE name=$4',[name.trim(),email.trim(),hash,role]); return NextResponse.json({ok:true},{status:201});
 } catch(e) {return NextResponse.json({error:e.code==='23505'?'El correo ya está registrado':'No se pudo crear el usuario'},{status:e.code==='23505'?409:500});}
}
