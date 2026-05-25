/**
 * Service to interface with Google Maps Traffic API (Simulated for MVP)
 */

export interface RouteTraffic {
  origin: { lat: number, lng: number };
  destination: { lat: number, lng: number };
  baseDurationMins: number;
  currentDurationMins: number;
  trafficLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  delayMins: number;
  closures: string[];
}

export async function fetchTrafficData(
  origin: { lat: number, lng: number }, 
  destination: { lat: number, lng: number }
): Promise<RouteTraffic> {
  // In production, this would call the Google Maps Directions API with departure_time=now
  // fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&departure_time=now&key=${process.env.GOOGLE_MAPS_API_KEY}`)
  
  // Simulated response calculating arbitrary distance
  const dx = origin.lat - destination.lat;
  const dy = origin.lng - destination.lng;
  const distanceKm = Math.sqrt(dx*dx + dy*dy) * 111; // Rough lat/lng to km approx
  
  const baseDurationMins = Math.max(10, Math.round(distanceKm * 1.5)); // Assume 40km/h average
  
  // Simulate heavy traffic if destination is near "city center" (arbitrary rule for simulation)
  let trafficLevel: RouteTraffic['trafficLevel'] = 'LOW';
  let delayMultiplier = 1.0;
  const closures: string[] = [];
  
  // Random simulation seed based on coordinates
  const randomSeed = (origin.lat + destination.lng) % 10;
  
  if (randomSeed > 8) {
    trafficLevel = 'CRITICAL';
    delayMultiplier = 3.5;
    closures.push("Major accident on primary route.");
  } else if (randomSeed > 6) {
    trafficLevel = 'HIGH';
    delayMultiplier = 2.0;
  } else if (randomSeed > 3) {
    trafficLevel = 'MEDIUM';
    delayMultiplier = 1.3;
  }
  
  const currentDurationMins = Math.round(baseDurationMins * delayMultiplier);
  
  return {
    origin,
    destination,
    baseDurationMins,
    currentDurationMins,
    trafficLevel,
    delayMins: currentDurationMins - baseDurationMins,
    closures
  };
}
