import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { groupMembers, medicalProfiles, travelGroups, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = await params;

    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, session.user.id)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [group] = await db.select().from(travelGroups).where(eq(travelGroups.id, groupId)).limit(1);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const members = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        role: groupMembers.role,
        medicalSharingConsent: groupMembers.medicalSharingConsent,
        joinedAt: groupMembers.joinedAt,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    const enrichedMembers = [];
    for (const member of members) {
      const [medical] = await db
        .select({
          conditionCategories: medicalProfiles.conditionCategories,
          shareWithGroup: medicalProfiles.shareWithGroup,
        })
        .from(medicalProfiles)
        .where(eq(medicalProfiles.userId, member.userId))
        .limit(1);

      const hasShared = Boolean(member.medicalSharingConsent && medical?.shareWithGroup);
      enrichedMembers.push({
        ...member,
        hasShared,
        conditionCategories: hasShared ? medical?.conditionCategories || [] : [],
      });
    }

    return NextResponse.json({
      data: {
        group,
        currentMembership: membership,
        members: enrichedMembers,
      },
    });
  } catch (err) {
    console.error('Failed to load group details:', err);
    return NextResponse.json({ error: 'Failed to load group details' }, { status: 500 });
  }
}
