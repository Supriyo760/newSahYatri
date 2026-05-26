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
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      // Only invoke Twilio API if credentials are valid and not placeholders
      if (accountSid && authToken && fromNumber && !accountSid.includes('placeholder') && !authToken.includes('placeholder')) {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: contact.phone,
            Body: message,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(`Twilio API error: ${errData.message || response.statusText}`);
        }

        console.log(`[EMERGENCY SMS] Real Twilio SMS successfully sent to ${contact.name} (${contact.phone})`);
        results.push({ contact: contact.name, status: 'sent' });
      } else {
        // Fallback for development if credentials are empty or placeholders
        console.log(`[EMERGENCY SMS MOCK] (Using Mock Fallback) Sent to ${contact.name} (${contact.phone}): ${message}`);
        results.push({ contact: contact.name, status: 'mock_sent' });
      }
      
      // In production: Integrate SendGrid for Email if required
      // if (contact.email) await sendGrid.send({...});
      
    } catch (err) {
      console.error(`Failed to notify ${contact.name}:`, err);
      results.push({ contact: contact.name, status: 'failed' });
    }
  }
  
  return results;
}
