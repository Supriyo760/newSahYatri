import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeneratedItineraryItem {
  day: number;
  time: string; // e.g. "09:00", "13:30"
  type: 'attraction' | 'food' | 'transport' | 'rest' | 'hidden_gem' | 'accommodation';
  name: string;
  description: string;
  search_query: string; // specifically for Google Maps query
  duration_minutes: number;
  estimated_cost_per_person: number;
  is_hidden_gem: boolean;
  tips?: string;
}

export interface GeneratedItineraryDay {
  day: number;
  theme: string;
  items: GeneratedItineraryItem[];
}

export interface GeneratedItinerary {
  destination: string;
  days: GeneratedItineraryDay[];
}

interface GenerationParams {
  destination: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  groupSize: number;
  budgetLevel: string;
  travelStyle: string;
  foodPreferences: string[];
  interests: string[];
}

async function geocodeDestination(dest: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: dest,
      limit: '1'
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'SahYatriApp/1.0'
      }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
  } catch (err) {
    console.error('Geocoding destination failed:', err);
  }
  return null;
}

async function fetchPOI(query: string, lat: number, lon: number): Promise<any[]> {
  const delta = 0.08; // ~8-9 km viewbox
  const minLng = lon - delta;
  const maxLng = lon + delta;
  const minLat = lat - delta;
  const maxLat = lat + delta;
  
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: query,
      viewbox: `${minLng},${maxLat},${maxLng},${minLat}`,
      bounded: '1',
      limit: '15'
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'SahYatriApp/1.0'
      }
    });
    return await res.json() || [];
  } catch (err) {
    console.error(`POI search failed for ${query}:`, err);
    return [];
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFallbackPOIs(dest: string, lat: number, lon: number): Promise<{ attractions: any[], food: any[] }> {
  // Try attraction first
  let attractions = await fetchPOI('attraction', lat, lon);
  
  if (attractions.length < 3) {
    // Try museum
    await delay(1000);
    const museums = await fetchPOI('museum', lat, lon);
    attractions = [...attractions, ...museums];
  }
  
  if (attractions.length < 3) {
    // Try historical sites
    await delay(1000);
    const history = await fetchPOI('historic', lat, lon);
    attractions = [...attractions, ...history];
  }

  if (attractions.length < 3) {
    // Try regional temples without bounded box
    await delay(1000);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: `${dest} temple`,
        limit: '10'
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'SahYatriApp/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        attractions = [...attractions, ...data];
      }
    } catch (err) {
      console.error('Fallback temple search failed:', err);
    }
  }

  if (attractions.length < 3) {
    // Try tourist without bounded box
    await delay(1000);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: `${dest} tourist attraction`,
        limit: '10'
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'SahYatriApp/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        attractions = [...attractions, ...data];
      }
    } catch (err) {
      console.error('Fallback unbounded search failed:', err);
    }
  }

  // Fetch food
  await delay(1000);
  let food = await fetchPOI('restaurant', lat, lon);
  if (food.length < 3) {
    await delay(1000);
    const cafes = await fetchPOI('cafe', lat, lon);
    food = [...food, ...cafes];
  }

  if (food.length < 3) {
    // Try local hotels without bounded box
    await delay(1000);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: `${dest} hotel`,
        limit: '10'
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'SahYatriApp/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        food = [...food, ...data];
      }
    } catch (err) {
      console.error('Fallback hotel search failed:', err);
    }
  }

  if (food.length < 3) {
    // Try general food without bounded box
    await delay(1000);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: `${dest} food`,
        limit: '10'
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'SahYatriApp/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        food = [...food, ...data];
      }
    } catch {}
  }

  // De-duplicate by name or display_name
  const uniqueAttractions: any[] = [];
  const attNames = new Set<string>();
  for (const a of attractions) {
    const name = a.name || a.display_name?.split(',')[0];
    if (name && !attNames.has(name.toLowerCase())) {
      attNames.add(name.toLowerCase());
      uniqueAttractions.push(a);
    }
  }

  const uniqueFood: any[] = [];
  const foodNames = new Set<string>();
  for (const f of food) {
    const name = f.name || f.display_name?.split(',')[0];
    if (name && !foodNames.has(name.toLowerCase())) {
      foodNames.add(name.toLowerCase());
      uniqueFood.push(f);
    }
  }

  return { attractions: uniqueAttractions, food: uniqueFood };
}

async function generateFallbackItinerary(params: GenerationParams): Promise<GeneratedItinerary> {
  const days: GeneratedItineraryDay[] = [];
  const dest = params.destination.trim();
  const destLower = dest.toLowerCase();

  // Fetch dynamic POIs once if it's an unknown destination
  let attractions: any[] = [];
  let food: any[] = [];
  let coords: { lat: number; lon: number } | null = null;
  const isCurated = destLower.includes('hazaribagh') || destLower.includes('hazaribag') || destLower.includes('goa') || destLower.includes('cochin') || destLower.includes('kochi') || destLower.includes('kerala');

  if (!isCurated) {
    try {
      coords = await geocodeDestination(dest);
      if (coords) {
        const pois = await fetchFallbackPOIs(dest, coords.lat, coords.lon);
        attractions = pois.attractions;
        food = pois.food;
      }
    } catch (err) {
      console.error('Failed to dynamically fetch OSM POIs:', err);
    }
  }

  for (let d = 1; d <= params.durationDays; d++) {
    let theme = '';
    let items: GeneratedItineraryItem[] = [];

    if (destLower.includes('hazaribagh') || destLower.includes('hazaribag')) {
      if (d === 1) {
        theme = 'Exploring the Scenic Hills & Lakes';
        items = [
          {
            day: d,
            time: '09:00',
            type: 'attraction',
            name: 'Canary Hill Viewpoint',
            description: 'Hike or drive up to Canary Hill to witness panoramic views of the forested valleys and the main Hazaribagh town.',
            search_query: 'Canary Hill, Hazaribagh',
            duration_minutes: 120,
            estimated_cost_per_person: 0,
            is_hidden_gem: false,
            tips: 'Climb the watchtower for the best photos.'
          },
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: "Frontier's Cafe",
            description: 'A highly popular modern cafe near Gandhi Maidan, famous for continental food, customized coffees, burgers, and student hangouts.',
            search_query: "Frontier's Cafe, Hazaribagh",
            duration_minutes: 90,
            estimated_cost_per_person: 6,
            is_hidden_gem: false,
            tips: 'Their iced coffees and paneer burgers are highly recommended by locals.'
          },
          {
            day: d,
            time: '16:00',
            type: 'attraction',
            name: 'Hazaribagh Lake',
            description: 'Stroll around the scenic series of concrete-bound lakes, popular for boating and peaceful sunset views.',
            search_query: 'Hazaribagh Lake, Jharkhand',
            duration_minutes: 120,
            estimated_cost_per_person: 2,
            is_hidden_gem: false,
            tips: 'Boating is highly recommended during sunset.'
          }
        ];
      } else if (d === 2) {
        theme = 'Tribal Art & Ancient Heritage';
        items = [
          {
            day: d,
            time: '09:30',
            type: 'attraction',
            name: 'Sanskriti Museum and Art Gallery',
            description: 'Browse through Justin Imam\'s curated museum highlighting prehistoric stone tools, ancient pottery, and regional Kohvar and Sohrai tribal paintings.',
            search_query: 'Sanskriti Museum, Hazaribagh',
            duration_minutes: 120,
            estimated_cost_per_person: 3,
            is_hidden_gem: true,
            tips: 'Ask for a guided explanation of the tribal motifs.'
          },
          {
            day: d,
            time: '12:00',
            type: 'food',
            name: 'Sudarshan Sweets & Restaurant',
            description: 'One of the oldest and most famous sweet shops in Hazaribagh, renowned for authentic samosas, hot gulab jamun, and local peda sweets.',
            search_query: 'Sudarshan Sweets, Hazaribagh',
            duration_minutes: 90,
            estimated_cost_per_person: 5,
            is_hidden_gem: false,
            tips: 'Renowned for morning kachori-sabzi and fresh evening gulab jamuns.'
          },
          {
            day: d,
            time: '14:30',
            type: 'attraction',
            name: 'Hazaribagh Wildlife Sanctuary',
            description: 'Drive through the scenic sal forests of the sanctuary to spot deer, nilgais, and various migratory bird species.',
            search_query: 'Hazaribagh Wildlife Sanctuary, Jharkhand',
            duration_minutes: 180,
            estimated_cost_per_person: 5,
            is_hidden_gem: false,
            tips: 'Keep silent to increase chances of wildlife sightings.'
          }
        ];
      } else if (d === 3) {
        theme = 'Lakeside Leisure & Garden Vibe';
        items = [
          {
            day: d,
            time: '10:00',
            type: 'attraction',
            name: 'Urban Haat Craft Center',
            description: 'A cultural marketplace exhibiting regional handlooms, local woodcrafts, and authentic tribal souvenirs.',
            search_query: 'Urban Haat, Hazaribagh',
            duration_minutes: 90,
            estimated_cost_per_person: 0,
            is_hidden_gem: false,
            tips: 'Great place to buy authentic Jharkhand handloom fabrics.'
          },
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: 'Skylight Garden Restaurant',
            description: 'A popular garden-themed family restaurant overlooking the lake, serving excellent North Indian curries, paneer dishes, and Chinese food.',
            search_query: 'Skylight Garden Restaurant, Hazaribagh',
            duration_minutes: 90,
            estimated_cost_per_person: 8,
            is_hidden_gem: false,
            tips: 'Try the butter paneer and garlic naan while sitting in the garden area.'
          }
        ];
      } else if (d === 4) {
        theme = 'Historical Outskirts & Spiritual Sights';
        items = [
          {
            day: d,
            time: '08:00',
            type: 'attraction',
            name: 'Konar Dam Scenic Vista',
            description: 'A beautiful drive to the nearby Konar Dam, built across the Konar River, offering vast water horizons and picnic lawns.',
            search_query: 'Konar Dam, Jharkhand',
            duration_minutes: 240,
            estimated_cost_per_person: 0,
            is_hidden_gem: true,
            tips: 'A perfect spot for a half-day group picnic.'
          },
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: 'Street Coffee Center',
            description: 'A bustling and legendary local joint on Matwari Road, famous for South Indian dishes, Dosa, coffee, and quick bites.',
            search_query: 'Street Coffee Center, Hazaribagh',
            duration_minutes: 90,
            estimated_cost_per_person: 4,
            is_hidden_gem: false,
            tips: 'Their Masala Dosa and Filter Coffee are local favorites.'
          },
          {
            day: d,
            time: '15:30',
            type: 'attraction',
            name: 'Rajrappa Temple Excursion',
            description: 'Visit the famous Chhinnamasta temple located at the confluence of Damodar and Bhairavi rivers.',
            search_query: 'Rajrappa Temple, Ramgarh',
            duration_minutes: 180,
            estimated_cost_per_person: 0,
            is_hidden_gem: false,
            tips: 'Wear conservative clothing.'
          }
        ];
      } else if (d === 5) {
        theme = 'Evening Grills & City Walks';
        items = [
          {
            day: d,
            time: '17:00',
            type: 'food',
            name: 'Kaka Ka Sekuwa',
            description: 'Famous local fast food and barbecue counter opposite Gandhi Maidan, popular for delicious grilled rolls, kebabs, and quick snacks.',
            search_query: 'Kaka Ka Sekuwa, Hazaribagh',
            duration_minutes: 60,
            estimated_cost_per_person: 3,
            is_hidden_gem: false,
            tips: 'Order the chicken double egg roll or paneer tikka roll.'
          }
        ];
      } else if (d === 6) {
        theme = 'Modern Cafe Hangouts';
        items = [
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: 'Cafeteria Midtown',
            description: 'A trendy student hangout café known for its sandwiches, mocktails, shakes, and fast food in a lively space.',
            search_query: 'Cafeteria Midtown, Hazaribagh',
            duration_minutes: 90,
            estimated_cost_per_person: 5,
            is_hidden_gem: false,
            tips: 'Their burgers and chocolate shakes are highly rated.'
          }
        ];
      } else if (d === 7) {
        theme = 'Saffron Dining Experience';
        items = [
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: 'Saffron Restaurant',
            description: 'Savor traditional north Indian delicacies, hot tandoori dishes, and local sweets.',
            search_query: 'Saffron Restaurant, Hazaribagh',
            duration_minutes: 90,
            estimated_cost_per_person: 8,
            is_hidden_gem: false,
            tips: 'Their paneer and butter chicken options are local favorites.'
          }
        ];
      } else {
        theme = 'Blues Fine Dining';
        items = [
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: 'The Blues Restaurant',
            description: 'Indulge in an authentic multi-cuisine lunch with popular Indian and Chinese dishes in a modern setting.',
            search_query: 'The Blues Restaurant, Hazaribagh',
            duration_minutes: 90,
            estimated_cost_per_person: 10,
            is_hidden_gem: false,
            tips: 'Their Indian breads and curries are highly rated.'
          }
        ];
      }
    } else if (destLower.includes('goa')) {
      if (d === 1) {
        theme = 'Coastal Arrival & Sunset Shack Vibe';
        items = [
          {
            day: d,
            time: '09:00',
            type: 'attraction',
            name: 'Calangute Beach Walk',
            description: 'Start your Goa journey with a fresh morning walk along the golden sand shoreline.',
            search_query: 'Calangute Beach, Goa',
            duration_minutes: 120,
            estimated_cost_per_person: 0,
            is_hidden_gem: false,
            tips: 'Wear sunscreen and carrying light slippers is recommended.'
          },
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: 'Curlies Beach Shack Lunch',
            description: 'Savor traditional Goan fish curry, prawn balchao, and refreshing mocktails right on the beach.',
            search_query: 'Curlies Beach Shack, Anjuna, Goa',
            duration_minutes: 90,
            estimated_cost_per_person: 15,
            is_hidden_gem: false,
            tips: 'Try their fresh seafood platter.'
          },
          {
            day: d,
            time: '16:00',
            type: 'attraction',
            name: 'Anjuna Sunset Point',
            description: 'A beautiful cliff view over the rocky cove, perfect for capturing sunset photographs.',
            search_query: 'Anjuna Sunset Point, Goa',
            duration_minutes: 120,
            estimated_cost_per_person: 0,
            is_hidden_gem: false,
            tips: 'Arrive early to secure a good viewing spot on the rocks.'
          }
        ];
      } else if (d === 2) {
        theme = 'Heritage Landmarks & Old Goa Architecture';
        items = [
          {
            day: d,
            time: '09:30',
            type: 'attraction',
            name: 'Basilica of Bom Jesus',
            description: 'UNESCO World Heritage Site holding the mortal remains of St. Francis Xavier.',
            search_query: 'Basilica of Bom Jesus, Old Goa',
            duration_minutes: 90,
            estimated_cost_per_person: 5,
            is_hidden_gem: false,
            tips: 'Ensure modest dress code for the place of worship.'
          },
          {
            day: d,
            time: '12:00',
            type: 'attraction',
            name: 'Fontainhas Latin Quarter',
            description: 'Explore the narrow winding streets lined with colorful Portuguese heritage villas.',
            search_query: 'Fontainhas, Panaji, Goa',
            duration_minutes: 120,
            estimated_cost_per_person: 0,
            is_hidden_gem: true,
            tips: 'Great spot for architectural and portrait photography.'
          },
          {
            day: d,
            time: '14:30',
            type: 'food',
            name: 'Viva Panjim Lunch',
            description: 'Award-winning quaint eatery serving authentic vindaloo and bebinca in a Portuguese cottage.',
            search_query: 'Viva Panjim, Panaji, Goa',
            duration_minutes: 90,
            estimated_cost_per_person: 12,
            is_hidden_gem: true,
            tips: 'Order the Goan Prawn Curry and classic Bebinca dessert.'
          }
        ];
      } else {
        theme = 'Nature Excursion & Scenic Waterfalls';
        items = [
          {
            day: d,
            time: '08:00',
            type: 'attraction',
            name: 'Dudhsagar Waterfalls Trek',
            description: 'Witness the majestic four-tiered waterfall cascading down the Western Ghats.',
            search_query: 'Dudhsagar Falls, Goa',
            duration_minutes: 240,
            estimated_cost_per_person: 25,
            is_hidden_gem: false,
            tips: 'Carry extra clothes and water bottles for the trek.'
          },
          {
            day: d,
            time: '14:00',
            type: 'food',
            name: 'Sahakari Spice Farm Lunch',
            description: 'A traditional buffet lunch served on banana leaves after an educational spice tour.',
            search_query: 'Sahakari Spice Farm, Ponda, Goa',
            duration_minutes: 120,
            estimated_cost_per_person: 10,
            is_hidden_gem: false,
            tips: 'Enjoy the herbal tea served at the reception.'
          }
        ];
      }
    } else if (destLower.includes('cochin') || destLower.includes('kochi') || destLower.includes('kerala')) {
      if (d === 1) {
        theme = 'Historic Harbor & Spice Heritage';
        items = [
          {
            day: d,
            time: '09:00',
            type: 'attraction',
            name: 'Fort Kochi Chinese Fishing Nets',
            description: 'Witness the iconic giant cantilevered Chinese fishing nets in action along the Fort Kochi beach front.',
            search_query: 'Fort Kochi Chinese Fishing Nets, Kerala',
            duration_minutes: 120,
            estimated_cost_per_person: 0,
            is_hidden_gem: false,
            tips: 'Best viewed at sunset or sunrise when fishermen are active.'
          },
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: 'Kashi Art Cafe Lunch',
            description: 'Enjoy healthy organic local food, fresh juices, and delicious cakes inside a cozy art gallery courtyard.',
            search_query: 'Kashi Art Cafe, Fort Kochi, Kerala',
            duration_minutes: 90,
            estimated_cost_per_person: 10,
            is_hidden_gem: false,
            tips: 'Try their special roast coffee and chocolate cake.'
          },
          {
            day: d,
            time: '17:00',
            type: 'attraction',
            name: 'Kathakali Center Performance',
            description: 'Watch a traditional Kathakali dance-drama performance, including the elaborate face make-up session.',
            search_query: 'Kerala Kathakali Centre, Fort Kochi',
            duration_minutes: 120,
            estimated_cost_per_person: 8,
            is_hidden_gem: false,
            tips: 'Arrive 1 hour early to watch the performers apply their elaborate makeup.'
          }
        ];
      } else if (d === 2) {
        theme = 'Cultural Landmarks & Jew Town';
        items = [
          {
            day: d,
            time: '09:30',
            type: 'attraction',
            name: 'Mattancherry Palace (Dutch Palace)',
            description: 'Stroll through this 16th-century palace featuring mural paintings depicting Hindu temple art.',
            search_query: 'Mattancherry Palace, Kochi, Kerala',
            duration_minutes: 90,
            estimated_cost_per_person: 5,
            is_hidden_gem: false,
            tips: 'Photography is prohibited inside the main mural galleries.'
          },
          {
            day: d,
            time: '11:30',
            type: 'attraction',
            name: 'Paradesi Synagogue (Jew Town)',
            description: 'The oldest active synagogue in the Commonwealth, featuring hand-painted Chinese porcelain tiles.',
            search_query: 'Paradesi Synagogue, Jew Town, Mattancherry',
            duration_minutes: 60,
            estimated_cost_per_person: 2,
            is_hidden_gem: true,
            tips: 'Modest attire required; shoes must be removed before entering.'
          },
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: 'Ginger House Restaurant Lunch',
            description: 'Waterfront dining in a museum restaurant surrounded by authentic antiques, serving traditional ginger dishes.',
            search_query: 'Ginger House Restaurant, Jew Town, Mattancherry',
            duration_minutes: 90,
            estimated_cost_per_person: 15,
            is_hidden_gem: true,
            tips: 'Try their signature Ginger Prawns and Ginger Ice Tea.'
          }
        ];
      } else {
        theme = 'Backwater Houseboats & Tropical Waterfalls';
        items = [
          {
            day: d,
            time: '09:00',
            type: 'attraction',
            name: 'Alleppey Houseboat Day Cruise',
            description: 'Glide through the serene backwater canals of Alappuzha on a traditional thatched roof Kettuvallam.',
            search_query: 'Alleppey Houseboat, Kerala',
            duration_minutes: 240,
            estimated_cost_per_person: 30,
            is_hidden_gem: false,
            tips: 'Keep cameras ready for scenic views of palm-fringed canals.'
          },
          {
            day: d,
            time: '13:30',
            type: 'food',
            name: 'Backwater Buffet Lunch',
            description: 'Feast on authentic spicy Kerala fish curry and red rice, cooked onboard using local spices.',
            search_query: 'backwater buffet lunch Kerala',
            duration_minutes: 90,
            estimated_cost_per_person: 12,
            is_hidden_gem: false,
            tips: 'Served on fresh banana leaves.'
          },
          {
            day: d,
            time: '16:30',
            type: 'attraction',
            name: 'Marari Beach Sunset Walk',
            description: 'Unwind on a quiet, clean, and uncrowded white sand beach lined with coconut groves.',
            search_query: 'Marari Beach, Kerala',
            duration_minutes: 120,
            estimated_cost_per_person: 0,
            is_hidden_gem: true,
            tips: 'Perfect spot for a relaxing evening walk away from city crowds.'
          }
        ];
      }
    } else {
      if (coords && attractions.length > 0 && food.length > 0) {
        theme = d === 1 
          ? `Discovering ${dest}` 
          : d === 2 
            ? `Local Culture & Heritage` 
            : `Exploring Scenic Landmarks`;

        const attractionIndex1 = ((d - 1) * 2) % attractions.length;
        const attractionIndex2 = ((d - 1) * 2 + 1) % attractions.length;
        const foodIndex = (d - 1) % food.length;
        
        const a1 = attractions[attractionIndex1];
        const a2 = attractions[attractionIndex2];
        const f = food[foodIndex];
        
        const a1Name = a1.name || a1.display_name.split(',')[0];
        const a2Name = a2.name || a2.display_name.split(',')[0];
        const fName = f.name || f.display_name.split(',')[0];

        items = [
          {
            day: d,
            time: '09:30',
            type: 'attraction',
            name: a1Name,
            description: `A highly rated local destination: ${a1.display_name}`,
            search_query: `${a1Name}, ${dest}`,
            duration_minutes: 120,
            estimated_cost_per_person: 0,
            is_hidden_gem: d > 1 && d % 2 === 0,
            tips: 'Recommended by local explorers.'
          },
          {
            day: d,
            time: '13:00',
            type: 'food',
            name: fName,
            description: `Popular dining spot in the area: ${f.display_name}`,
            search_query: `${fName}, ${dest}`,
            duration_minutes: 90,
            estimated_cost_per_person: 8,
            is_hidden_gem: false,
            tips: 'Try the local specialities recommended by the staff.'
          },
          {
            day: d,
            time: '15:30',
            type: 'attraction',
            name: a2Name,
            description: `Explore the sights and landscape: ${a2.display_name}`,
            search_query: `${a2Name}, ${dest}`,
            duration_minutes: 120,
            estimated_cost_per_person: 0,
            is_hidden_gem: false,
            tips: 'Capture beautiful photographs during your visit.'
          }
        ];
      } else {
        if (d === 1) {
          theme = `Exploring the Heart of ${dest}`;
          items = [
            {
              day: d,
              time: '09:00',
              type: 'attraction',
              name: `${dest} Central Square`,
              description: `Start your trip with a walking tour of the most famous central landmarks in ${dest}.`,
              search_query: `${dest} Center`,
              duration_minutes: 120,
              estimated_cost_per_person: 0,
              is_hidden_gem: false,
              tips: 'Wear comfortable shoes.'
            },
            {
              day: d,
              time: '12:30',
              type: 'food',
              name: 'Local Flavors Cafe',
              description: 'Try the traditional dishes and street food styled delicacies recommended by locals.',
              search_query: `best local food in ${dest}`,
              duration_minutes: 90,
              estimated_cost_per_person: 15,
              is_hidden_gem: false,
              tips: 'Ask for the daily specials.'
            },
            {
              day: d,
              time: '15:00',
              type: 'attraction',
              name: 'Historic Heritage Museum',
              description: 'Dive deep into the local history, art, and traditions of this wonderful city.',
              search_query: `${dest} Museum`,
              duration_minutes: 150,
              estimated_cost_per_person: 10,
              is_hidden_gem: false,
              tips: 'Audio guides are available at the entrance.'
            }
          ];
        } else if (d === 2) {
          theme = 'Local Culture & Panoramic Views';
          items = [
            {
              day: d,
              time: '10:00',
              type: 'attraction',
              name: 'High Hill Viewpoint',
              description: 'A moderate hike or cable car ride to get the ultimate panoramic vista of the area.',
              search_query: `${dest} viewpoint`,
              duration_minutes: 120,
              estimated_cost_per_person: 8,
              is_hidden_gem: false,
              tips: 'Early morning or late afternoon provides the best light.'
            },
            {
              day: d,
              time: '13:00',
              type: 'food',
              name: 'The Hidden Garden Restaurant',
              description: 'A cozy lunch spot tucked away in a quiet courtyard, serving home-cooked organic meals.',
              search_query: `bistro in ${dest}`,
              duration_minutes: 90,
              estimated_cost_per_person: 18,
              is_hidden_gem: true,
              tips: 'Try the organic herbal iced teas.'
            },
            {
              day: d,
              time: '15:30',
              type: 'attraction',
              name: 'Old Town Crafts Market',
              description: 'Stroll through alleys of local artisans selling handmade textiles, pottery, and jewelry.',
              search_query: `${dest} market`,
              duration_minutes: 120,
              estimated_cost_per_person: 0,
              is_hidden_gem: true,
              tips: 'Polite bargaining is common here.'
            }
          ];
        } else {
          theme = 'Outdoors & Off-The-Beaten-Path Adventure';
          items = [
            {
              day: d,
              time: '09:00',
              type: 'attraction',
              name: 'Nature Reserve Sanctuary',
              description: 'Hike through scenic trails, spotting local flora, fauna, and scenic waterfalls.',
              search_query: `${dest} park`,
              duration_minutes: 180,
              estimated_cost_per_person: 5,
              is_hidden_gem: true,
              tips: 'Carry water and respect the wildlife.'
            },
            {
              day: d,
              time: '13:30',
              type: 'food',
              name: 'Riverside Picnic Lunch',
              description: 'Dine on fresh pastries, cheeses, and fruits by the tranquil river bend.',
              search_query: `bakery in ${dest}`,
              duration_minutes: 60,
              estimated_cost_per_person: 10,
              is_hidden_gem: false,
              tips: 'Clean up after yourself to protect the park.'
            }
          ];
        }
      }
    }

    days.push({ day: d, theme, items });
  }

  return { destination: dest, days };
}

export async function generateItinerary(params: GenerationParams): Promise<GeneratedItinerary> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isPlaceholder = !apiKey || apiKey === 'sk-placeholder' || apiKey.startsWith('sk-Placeholder') || apiKey.includes('placeholder') || apiKey.length < 5;

  if (isPlaceholder) {
    console.log('Using fallback itinerary generator because Gemini API key is missing');
    return await generateFallbackItinerary(params);
  }

  try {
    const hiddenGemInstruction = params.durationDays >= 5
      ? "Include about 30-40% highly-rated but lesser-known local spots (hidden gems). Set is_hidden_gem to true for these."
      : "Strictly focus on main tourist spots. Do NOT include hidden gems. Set is_hidden_gem to false for all.";

    const prompt = `
Generate a highly personalized travel itinerary for a group traveling to ${params.destination}.
Details:
- Duration: ${params.durationDays} days (from ${params.startDate} to ${params.endDate})
- Group size: ${params.groupSize} people
- Budget tier: ${params.budgetLevel}
- Group travel style: ${params.travelStyle}
- Food preferences: ${params.foodPreferences.join(', ') || 'Mixed'}
- Shared interests: ${params.interests.join(', ') || 'General sightseeing'}

Rules:
1. Provide a realistic day-by-day plan with 3-4 structured items per day.
2. ${hiddenGemInstruction}
3. Format each item with a "search_query" that can be used on Google Maps (e.g. "Humayun's Tomb, New Delhi" instead of just "Tomb").
4. Response must be valid JSON matching the schema:
{
  "destination": "...",
  "days": [
    {
      "day": 1,
      "theme": "...",
      "items": [
        {
          "day": 1,
          "time": "09:00",
          "type": "attraction|food|transport|rest|hidden_gem|accommodation",
          "name": "...",
          "description": "...",
          "search_query": "...",
          "duration_minutes": 120,
          "estimated_cost_per_person": 15,
          "is_hidden_gem": false,
          "tips": "..."
        }
      ]
    }
  ]
}
    `.trim();

    const genAI = new GoogleGenerativeAI(apiKey!);
    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-pro"
    ];

    let content = null;
    let lastErr = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(`You are SahYatri, an AI travel concierge specializing in optimized, personalized itineraries. Respond ONLY in valid JSON.\n\n${prompt}`);
        content = result.response.text();
        
        if (content) {
          console.log(`Successfully generated itinerary using ${modelName}`);
          break; // Exit the loop if successful
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${modelName} failed:`, err.message);
        
        // If it's a 401 Unauthorized or API Key Invalid, immediately stop
        if (err.message && (err.message.includes('401') || err.message.includes('API key not valid'))) {
          break;
        }
      }
    }
    
    if (!content) {
      throw lastErr || new Error('AI failed to generate itinerary');
    }

    return JSON.parse(content) as GeneratedItinerary;
  } catch (err: any) {
    if (!isPlaceholder && apiKey) {
      throw new Error(`Gemini API Error: ${err.message || 'Invalid API Key or connection failed'}. Please check your GEMINI_API_KEY.`);
    }
    console.warn('Gemini itinerary generation failed, falling back to local generator:', err);
    return await generateFallbackItinerary(params);
  }
}

