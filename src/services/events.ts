/**
 * Service to interface with Local Event APIs (Ticketmaster / local scrapers)
 */

export interface LocalEvent {
  id: string;
  name: string;
  type: 'Festival' | 'Protest' | 'Concert' | 'Roadwork';
  location: { lat: number, lng: number };
  radiusKm: number;
  startTime: string;
  endTime: string;
  impactsTraffic: boolean;
  isAttractive: boolean; // True if it's something a tourist might want to see
}

export async function fetchLocalEvents(cityCenter: { lat: number, lng: number }, date: string): Promise<LocalEvent[]> {
  // Simulated response
  // In production, aggregate data from local municipality feeds or Ticketmaster API
  
  const now = new Date(date);
  const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
  
  return [
    {
      id: "evt_1",
      name: "City Food & Cultural Festival",
      type: "Festival",
      location: { lat: cityCenter.lat + 0.02, lng: cityCenter.lng - 0.01 },
      radiusKm: 2.0,
      startTime: now.toISOString(),
      endTime: tomorrow.toISOString(),
      impactsTraffic: true,
      isAttractive: true
    },
    {
      id: "evt_2",
      name: "Downtown Road Reconstruction",
      type: "Roadwork",
      location: { lat: cityCenter.lat - 0.03, lng: cityCenter.lng + 0.02 },
      radiusKm: 1.5,
      startTime: new Date(now.getTime() - (48 * 60 * 60 * 1000)).toISOString(),
      endTime: new Date(now.getTime() + (72 * 60 * 60 * 1000)).toISOString(),
      impactsTraffic: true,
      isAttractive: false
    }
  ];
}
