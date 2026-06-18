import { db } from '@/db';
import { groupMembers, preMatchChats, travelGroups, trips } from '@/db/schema';
import { and, eq, or } from 'drizzle-orm';

export async function getGroupForMember(userId: string, groupId: string) {
  const [row] = await db
    .select({
      id: travelGroups.id,
      name: travelGroups.name,
      status: travelGroups.status,
      maxMembers: travelGroups.maxMembers,
      destination: travelGroups.destination,
      tripStartDate: travelGroups.tripStartDate,
      tripEndDate: travelGroups.tripEndDate,
      createdBy: travelGroups.createdBy,
      compatibilityScore: travelGroups.compatibilityScore,
      inviteCode: travelGroups.inviteCode,
      createdAt: travelGroups.createdAt,
      updatedAt: travelGroups.updatedAt,
      membershipId: groupMembers.id,
      memberRole: groupMembers.role,
    })
    .from(travelGroups)
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, travelGroups.id),
        eq(groupMembers.userId, userId),
      ),
    )
    .where(eq(travelGroups.id, groupId))
    .limit(1);

  return row ?? null;
}

export async function isGroupMember(userId: string, groupId: string) {
  const group = await getGroupForMember(userId, groupId);
  return Boolean(group);
}

export async function getTripForMember(userId: string, tripId: string) {
  const [row] = await db
    .select({
      id: trips.id,
      groupId: trips.groupId,
      destination: trips.destination,
      startDate: trips.startDate,
      endDate: trips.endDate,
      durationDays: trips.durationDays,
      status: trips.status,
      totalBudget: trips.totalBudget,
      perPersonBudget: trips.perPersonBudget,
      currency: trips.currency,
      hiddenGemMode: trips.hiddenGemMode,
      createdAt: trips.createdAt,
      updatedAt: trips.updatedAt,
      membershipId: groupMembers.id,
      memberRole: groupMembers.role,
    })
    .from(trips)
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, trips.groupId),
        eq(groupMembers.userId, userId),
      ),
    )
    .where(eq(trips.id, tripId))
    .limit(1);

  return row ?? null;
}

export async function isPreMatchParticipant(userId: string, chatId: string) {
  const [chat] = await db
    .select({ id: preMatchChats.id })
    .from(preMatchChats)
    .where(
      and(
        eq(preMatchChats.id, chatId),
        or(
          eq(preMatchChats.initiatorId, userId),
          eq(preMatchChats.recipientId, userId),
        ),
      ),
    )
    .limit(1);

  return Boolean(chat);
}

export async function isDirectChatParticipant(userId: string, chatId: string) {
  const { directChats } = await import('@/db/schema');
  const [chat] = await db
    .select({ id: directChats.id })
    .from(directChats)
    .where(
      and(
        eq(directChats.id, chatId),
        or(
          eq(directChats.userAId, userId),
          eq(directChats.userBId, userId),
        ),
      ),
    )
    .limit(1);

  return Boolean(chat);
}

