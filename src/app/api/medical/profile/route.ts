import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { medicalProfiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encryptField, decryptField } from '@/lib/medical/encryption';
import { z } from 'zod';

const medicalSchema = z.object({
  bloodType: z.string().optional(),
  conditions: z.array(z.object({
    name: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']),
    notes: z.string().optional(),
  })).default([]),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    schedule: z.string(),
    notes: z.string().optional(),
  })).default([]),
  allergies: z.array(z.object({
    allergen: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe', 'anaphylactic']),
    response: z.string(),
    hasEpipen: z.boolean().default(false),
  })).default([]),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
    isPrimary: z.boolean().default(false),
  })).default([]),
  firstAidNotes: z.string().optional(),
  shareWithGroup: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const body = await req.json();
    const data = medicalSchema.parse(body);

    // Derive non-sensitive categories for group display
    const conditionCategories = data.conditions.map(c => c.name.toLowerCase());
    data.allergies.forEach(a => {
      if (a.severity === 'anaphylactic') conditionCategories.push(`severe-${a.allergen}-allergy`);
    });

    await db.insert(medicalProfiles).values({
      userId: session.user.id,
      bloodType: data.bloodType,
      conditionsEncrypted: encryptField(data.conditions),
      medicationsEncrypted: encryptField(data.medications),
      allergiesEncrypted: encryptField(data.allergies),
      emergencyContactsEncrypted: encryptField(data.emergencyContacts),
      firstAidNotesEncrypted: data.firstAidNotes ? encryptField(data.firstAidNotes) : null,
      conditionCategories,
      shareWithGroup: data.shareWithGroup,
    }).onConflictDoUpdate({
      target: medicalProfiles.userId,
      set: {
        conditionsEncrypted: encryptField(data.conditions),
        medicationsEncrypted: encryptField(data.medications),
        allergiesEncrypted: encryptField(data.allergies),
        emergencyContactsEncrypted: encryptField(data.emergencyContacts),
        firstAidNotesEncrypted: data.firstAidNotes ? encryptField(data.firstAidNotes) : null,
        conditionCategories,
        shareWithGroup: data.shareWithGroup,
        updatedAt: new Date(),
      },
    });

    await db.update(users)
      .set({ isOnboarded: true, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues);
    }
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Failed to save medical profile:', err);
    return errorResponse('INTERNAL_ERROR', `Failed to save medical profile: ${message}`, 500);
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  const [profile] = await db.select().from(medicalProfiles)
    .where(eq(medicalProfiles.userId, session.user.id)).limit(1);

  if (!profile) return successResponse(null, 200);

  // Decrypt only for the profile owner
  return NextResponse.json({
    data: {
      bloodType: profile.bloodType,
      conditions: decryptField(profile.conditionsEncrypted),
      medications: decryptField(profile.medicationsEncrypted),
      allergies: decryptField(profile.allergiesEncrypted),
      emergencyContacts: decryptField(profile.emergencyContactsEncrypted),
      firstAidNotes: decryptField(profile.firstAidNotesEncrypted),
      shareWithGroup: profile.shareWithGroup,
    },
  });
}
