/**
 * Proactive Alerts Cron Worker
 * This script is intended to be run every 15-30 minutes.
 * It checks the upcoming itineraries for all active trips against real-time weather and traffic.
 */

// import { trips, groupMembers } from '../db/schema';
import { checkAndReplanItinerary } from '../lib/itinerary/replanner';
import { sendPushNotification } from '../lib/notifications/push';

export async function runAlertsCron() {
  console.log('[CRON] Starting Proactive Alerts Check...');
  
  try {
    // 1. Fetch all active trips that are currently happening today
    // Mocking for MVP
    const activeTrips = [
      {
        id: 'trip_1',
        name: 'Delhi Heritage Walk',
        groupId: 'group_A',
        cityCenter: { lat: 28.6139, lng: 77.2090 },
        nextActivities: [
          { id: 'act_1', name: 'Red Fort', type: 'outdoor' as const, location: { lat: 28.6562, lng: 77.2410 }, startTime: new Date().toISOString(), estimatedDurationMins: 120 }
        ]
      }
    ];

    // 2. Run the dynamic replanner logic on each active trip
    for (const trip of activeTrips) {
      const replanResult = await checkAndReplanItinerary(trip.nextActivities, trip.cityCenter);
      
      if (replanResult.needsReplanning) {
        console.log(`[CRON] Trip ${trip.name} needs replanning: ${replanResult.reason}`);
        
        // 3. Dispatch a push notification to the group members
        const payload = {
          title: '⚠️ SahYatri Alert: Itinerary Disrupted',
          body: replanResult.reason || 'Weather or traffic conditions require an itinerary update.',
          data: { url: `/trips/${trip.id}/itinerary` }
        };
        
        // In a real app, we'd fetch all userIds in the group
        const groupUserIds = ['user_1', 'user_2', 'user_3'];
        
        for (const userId of groupUserIds) {
          await sendPushNotification(userId, payload);
        }
      }
    }
    
    console.log('[CRON] Alerts check completed.');
  } catch (err) {
    console.error('[CRON] Failed to run alerts check:', err);
  }
}

// If run directly via node
if (require.main === module) {
  runAlertsCron().then(() => process.exit(0));
}
