/**
 * Medication Reminder System
 */

export interface MedicationSchedule {
  id: string;
  userId: string;
  medicationName: string;
  dosage: string;
  timeOfDay: string[]; // e.g., ["08:00", "20:00"]
  instructions: string;
}

export function generateReminderPayload(schedule: MedicationSchedule, currentTime: string) {
  return {
    title: `Time to take ${schedule.medicationName}`,
    body: `Dosage: ${schedule.dosage}. ${schedule.instructions}`,
    data: {
      url: `/safety/medications`,
      medicationId: schedule.id
    }
  };
}

export async function processMedicationReminders(schedules: MedicationSchedule[]) {
  const now = new Date();
  const currentHourMin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const dueReminders = schedules.filter(s => s.timeOfDay.includes(currentHourMin));
  
  for (const reminder of dueReminders) {
    const payload = generateReminderPayload(reminder, currentHourMin);
    // In production, send via Web Push API or Firebase Cloud Messaging
    console.log(`[PUSH NOTIFICATION] To User ${reminder.userId}: ${payload.title} - ${payload.body}`);
  }
  
  return dueReminders.length;
}
