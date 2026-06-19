import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { medicalProfiles, groupMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { findNearbyMedicalFacilities } from '@/services/google-maps';

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
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { lat, lng, groupId } = await req.json();

    // Find nearby medical facilities
    const [hospitals, pharmacies, clinics] = await Promise.all([
      findNearbyMedicalFacilities(lat, lng, 'hospital', 10000),
      findNearbyMedicalFacilities(lat, lng, 'pharmacy', 5000),
      findNearbyMedicalFacilities(lat, lng, 'clinic', 5000),
    ]);

    // Get consenting group members' condition categories
    const members = groupId ? await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId)) : [];

    // Gather relevant first-aid protocols for this group
    const protocols: string[][] = [];
    for (const member of members) {
      const [profile] = await db.select()
        .from(medicalProfiles)
        .where(eq(medicalProfiles.userId, member.userId))
        .limit(1);

      if (!profile?.shareWithGroup || !profile?.conditionCategories) continue;
      
      for (const cat of profile.conditionCategories) {
        const catLower = cat.toLowerCase();
        let protocolKey: string | null = null;
        
        if (catLower.includes('diabet')) protocolKey = 'diabetes';
        else if (catLower.includes('asthm') || catLower.includes('astham')) protocolKey = 'asthma';
        else if (catLower.includes('epilep') || catLower.includes('seiz')) protocolKey = 'epilepsy';
        else if (catLower.includes('nut') || catLower.includes('peanut')) protocolKey = 'severe-nut-allergy';
        else protocolKey = catLower;

        const protocol = FIRST_AID_PROTOCOLS[protocolKey];
        if (protocol && !protocols.includes(protocol)) protocols.push(protocol);
      }
    }

    const formatFacility = (f: any) => ({
      name: f.name,
      address: f.vicinity,
      lat: f.geometry.location.lat,
      lng: f.geometry.location.lng,
      placeId: f.place_id,
      isOpen: f.opening_hours?.open_now,
    });

    return NextResponse.json({
      data: {
        hospitals: hospitals.slice(0, 3).map(formatFacility),
        pharmacies: pharmacies.slice(0, 3).map(formatFacility),
        clinics: clinics.slice(0, 3).map(formatFacility),
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
    return errorResponse('INTERNAL_ERROR', 'Emergency routing failed', 500);
  }
}
