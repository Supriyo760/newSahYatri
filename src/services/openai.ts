import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

export async function generateItinerary(params: GenerationParams): Promise<GeneratedItinerary> {
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are SahYatri, an AI travel concierge specializing in optimized, personalized itineraries. Respond ONLY in valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('AI failed to generate itinerary');

  return JSON.parse(content) as GeneratedItinerary;
}
