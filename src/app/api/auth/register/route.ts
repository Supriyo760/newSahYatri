import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().min(18).max(100),
  gender: z.string().optional(),
  nationality: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const [existing] = await db.select().from(users)
      .where(eq(users.email, data.email)).limit(1);

    if (existing) {
      return errorResponse('ERROR', 'Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      passwordHash,
      age: data.age,
      gender: data.gender,
      nationality: data.nationality,
    }).returning({ id: users.id, email: users.email, name: users.name });

    return successResponse(user, 201);
  } catch (err) {
    console.error('Registration error:', err);
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues);
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Registration failed' }, { status: 500 });
  }
}
