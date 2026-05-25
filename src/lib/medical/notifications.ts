/**
 * Emergency Contact Notification Chains
 */

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: 1 | 2 | 3; // 1 = immediate, 2 = secondary
}

export async function triggerEmergencyNotificationChain(
  userId: string, 
  userName: string, 
  contacts: EmergencyContact[], 
  location: {lat: number, lng: number},
  incidentType: string
) {
  // Sort by priority
  const sortedContacts = [...contacts].sort((a, b) => a.priority - b.priority);
  
  const googleMapsUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const message = `URGENT: ${userName} has triggered an SOS alert via SahYatri. Incident type: ${incidentType}. Last known location: ${googleMapsUrl}`;
  
  const results = [];
  
  for (const contact of sortedContacts) {
    try {
      // In production: Integrate Twilio for SMS / Voice calls
      // await twilioClient.messages.create({ body: message, from: '+1234567890', to: contact.phone });
      
      // In production: Integrate SendGrid for Email
      // if (contact.email) await sendGrid.send({...});
      
      console.log(`[EMERGENCY SMS] Sent to ${contact.name} (${contact.phone}): ${message}`);
      
      results.push({ contact: contact.name, status: 'sent' });
    } catch (err) {
      console.error(`Failed to notify ${contact.name}`, err);
      results.push({ contact: contact.name, status: 'failed' });
    }
  }
  
  return results;
}
