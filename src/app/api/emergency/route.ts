import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { medicalProfiles, groupMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { findNearbyHospitals } from '@/services/google-maps';

// Pre-written first aid protocols per condition category
const FIRST_AID_PROTOCOLS: Record<string, string[]> = {
  diabetes: [
    'Check if the person is conscious and responsive',
    'If confused or shaking: give 15g fast-acting carbs (glucose tablet, juice, or regular soda)',
    'Wait 15 minutes and reassess',
    'If unconscious: DO NOT give anything by mouth — call emergency services immediately',
    'Place in recovery position if unconscious',
  ],
  'severe-nut-allergy': [
    'Administer EpiPen immediately if available (outer thigh, through clothing is OK)',
    'Call emergency services (112/911) immediately — even after EpiPen',
    'Have the person sit upright if breathing difficulty',
    'Lay flat with legs raised if showing signs of shock',
    'A second EpiPen dose can be given after 5-15 minutes if no improvement',
  ],
  epilepsy: [
    'Stay calm. Time the seizure.',
    'Clear the area of dangerous objects',
    'Place something soft under their head',
    'Do NOT restrain movement or put anything in their mouth',
    'Turn on side after convulsions stop (recovery position)',
    'Call emergency if: seizure > 5 minutes, second seizure follows, or person does not regain consciousness',
  ],
  asthma: [
    'Help the person use their reliever inhaler (usually blue)',
    'Sit them upright — do not lay them down',
    '4-8 puffs every 4 minutes if no improvement',
    'Call emergency services if no inhaler, no improvement after 4 puffs, or worsening',
    'Stay calm and reassure the person',
  ],
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { lat, lng, groupId } = await req.json();

    // Find nearby hospitals
    const hospitals = await findNearbyHospitals(lat, lng, 10000);

    // Get consenting group members' condition categories
    const members = groupId ? await db
      .select({ userId: groupMembers.userId, medicalSharingConsent: groupMembers.medicalSharingConsent })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId)) : [];

    // Gather relevant first-aid protocols for this group
    const protocols: string[][] = [];
    for (const member of members) {
      if (!member.medicalSharingConsent) continue;
      const [profile] = await db.select()
        .from(medicalProfiles)
        .where(eq(medicalProfiles.userId, member.userId))
        .limit(1);

      if (!profile?.conditionCategories) continue;
      for (const cat of profile.conditionCategories) {
        const protocol = FIRST_AID_PROTOCOLS[cat];
        if (protocol && !protocols.includes(protocol)) protocols.push(protocol);
      }
    }

    return NextResponse.json({
      data: {
        hospitals: hospitals.slice(0, 3).map((h: any) => ({
          name: h.name,
          address: h.vicinity,
          lat: h.geometry.location.lat,
          lng: h.geometry.location.lng,
          placeId: h.place_id,
          isOpen: h.opening_hours?.open_now,
        })),
        firstAidProtocols: protocols,
        emergencyNumbers: {
          india: '112',
          international: '911',
          ambulance: '108',
        },
      },
    });
  } catch (err) {
    console.error('Emergency routing failed:', err);
    return NextResponse.json({ error: 'Emergency routing failed' }, { status: 500 });
  }
}
