/**
 * Service to interface with OpenWeather API (Simulated for MVP)
 */

export interface WeatherCondition {
  timestamp: string;
  temp_c: number;
  condition: 'Clear' | 'Rain' | 'Storm' | 'Snow' | 'Cloudy';
  severityLevel: 0 | 1 | 2 | 3; // 0 = fine, 3 = dangerous
  alerts: string[];
}

export async function fetchHourlyForecast(lat: number, lng: number): Promise<WeatherCondition[]> {
  // In production, this would call:
  // fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&exclude=current,minutely,daily,alerts&appid=${process.env.OPENWEATHER_API_KEY}`)
  
  // Simulated response
  const baseTemp = 25; // 25 C
  const conditions: WeatherCondition[] = [];
  
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + (i * 60 * 60 * 1000));
    
    // Simulate a rain storm developing around hour 5
    let condition: WeatherCondition['condition'] = 'Clear';
    let severity: WeatherCondition['severityLevel'] = 0;
    const alerts: string[] = [];
    
    if (i >= 4 && i <= 7) {
      condition = 'Rain';
      severity = 1;
    } else if (i >= 8 && i <= 10) {
      condition = 'Storm';
      severity = 3;
      alerts.push("Severe thunderstorm warning. Avoid outdoor activities.");
    } else if (i > 10 && i < 15) {
      condition = 'Cloudy';
    }
    
    conditions.push({
      timestamp: time.toISOString(),
      temp_c: baseTemp - (i % 5),
      condition,
      severityLevel: severity,
      alerts
    });
  }
  
  return conditions;
}

export function hasSevereWeatherUpcoming(forecast: WeatherCondition[], withinHours: number = 6): boolean {
  return forecast.slice(0, withinHours).some(f => f.severityLevel >= 2);
}
