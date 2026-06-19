import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { trips, itineraryDays, itineraryItems } from '@/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const tripId = (await params).tripId;
    const { searchParams } = new URL(req.url);
    const dayNumberParam = searchParams.get('dayNumber');
    
    if (!tripId || !dayNumberParam) {
      return NextResponse.json({ error: 'Missing tripId or dayNumber' }, { status: 400 });
    }

    const dayNumber = parseInt(dayNumberParam, 10);

    // 1. Fetch trip and check it exists
    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // 2. Fetch the specific day
    const day = await db.query.itineraryDays.findFirst({
      where: and(eq(itineraryDays.tripId, tripId), eq(itineraryDays.dayNumber, dayNumber)),
    });

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    const items = await db.select()
      .from(itineraryItems)
      .where(eq(itineraryItems.dayId, day.id))
      .orderBy(asc(itineraryItems.orderIndex));

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items found for this day' }, { status: 404 });
    }

    // Filter out items without coordinates
    const locationItems = items.filter((item: any) => item.lat !== null && item.lng !== null);

    if (locationItems.length < 2) {
      return NextResponse.json({ error: 'Not enough mapped locations to generate radar' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (!apiKey || apiKey === 'AIzaSyPlaceholder') {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 501 });
    }

    // 3. Prepare parameters for Google Directions API
    const origin = `${locationItems[0].lat},${locationItems[0].lng}`;
    const destination = `${locationItems[locationItems.length - 1].lat},${locationItems[locationItems.length - 1].lng}`;
    
    let waypointsParam = '';
    if (locationItems.length > 2) {
      const waypoints = locationItems.slice(1, -1).map(item => `${item.lat},${item.lng}`);
      waypointsParam = `&waypoints=optimize:true|${waypoints.join('|')}`;
    }

    // Calculate departure time (9:00 AM on the day of the itinerary)
    const tripDate = new Date(day.date);
    tripDate.setHours(9, 0, 0, 0);
    let departureTimeMs = tripDate.getTime();
    
    // If the date is in the past, Google Directions API requires 'now' or a future time.
    // So if the planned day is in the past, just use now + 5 mins to still get a result
    if (departureTimeMs < Date.now()) {
      departureTimeMs = Date.now() + 5 * 60 * 1000;
    }
    const departureTimeSeconds = Math.floor(departureTimeMs / 1000);

    // 4. Fetch optimal route and traffic from Google Directions API
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam}&departure_time=${departureTimeSeconds}&key=${apiKey}`;
    
    const dirRes = await fetch(directionsUrl);
    const dirData = await dirRes.json();

    if (dirData.status !== 'OK' || !dirData.routes || dirData.routes.length === 0) {
      console.error('Directions API error:', dirData.status, dirData.error_message);
      return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 });
    }

    const route = dirData.routes[0];
    const legs = route.legs;
    const waypointOrder = route.waypoint_order; // Array of indices mapping the optimized waypoints

    // Map the optimized order back to our item IDs
    // The origin is always index 0, destination is always the last.
    const optimalOrder = [locationItems[0].id];
    if (locationItems.length > 2) {
      waypointOrder.forEach((idx: number) => {
        optimalOrder.push(locationItems[idx + 1].id);
      });
    }
    optimalOrder.push(locationItems[locationItems.length - 1].id);

    // 5. Build nodes and edges for the frontend Radar SVG
    const nodes = locationItems.map(item => ({
      id: item.id,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      type: item.type,
      isHiddenGem: item.isHiddenGem
    }));

    const edges = [];
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const fromId = optimalOrder[i];
      const toId = optimalOrder[i + 1];
      
      const normalDuration = leg.duration.value; // seconds
      const trafficDuration = leg.duration_in_traffic ? leg.duration_in_traffic.value : normalDuration;
      
      // Calculate congestion
      const congestionRatio = trafficDuration / normalDuration;
      let status = 'clear';
      if (congestionRatio >= 1.5) status = 'congested';
      else if (congestionRatio >= 1.2) status = 'moderate';

      // Collect polyline points for this leg
      const polylinePoints: string[] = [];
      if (leg.steps) {
        leg.steps.forEach((step: any) => {
          if (step.polyline && step.polyline.points) {
            polylinePoints.push(step.polyline.points);
          }
        });
      }

      edges.push({
        from: fromId,
        to: toId,
        durationMinutes: Math.round(trafficDuration / 60),
        congestionRatio,
        status,
        polylines: polylinePoints
      });
    }

    // 6. Fetch Nearest Hospital (Emergency Hub)
    let nearestHospital = null;
    const hospitalUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${destination}&radius=5000&type=hospital&key=${apiKey}`;
    try {
      const hospRes = await fetch(hospitalUrl);
      const hospData = await hospRes.json();
      if (hospData.status === 'OK' && hospData.results.length > 0) {
        const h = hospData.results[0];
        // Calculate rough distance using Haversine or just return the coords
        nearestHospital = {
          name: h.name,
          lat: h.geometry.location.lat,
          lng: h.geometry.location.lng,
        };
      }
    } catch (err) {
      console.error('Failed to fetch hospital:', err);
    }

    return NextResponse.json({
      nodes,
      edges,
      optimalOrder,
      nearestHospital,
      stats: {
        totalDurationMinutes: edges.reduce((sum, e) => sum + e.durationMinutes, 0),
        congestedSegments: edges.filter(e => e.status === 'congested').length,
        pathsProcessed: 1 // Directions API did it in 1 request!
      }
    });

  } catch (err) {
    console.error('Route Radar Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
