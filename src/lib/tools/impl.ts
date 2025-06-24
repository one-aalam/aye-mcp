
export interface GeocodingAPIResponse {
    results: Result[]
    generationtime_ms: number
  }
  
  export interface Result {
    id: number
    name: string
    latitude: number
    longitude: number
    elevation: number
    feature_code: string
    country_code: string
    admin1_id: number
    admin2_id: number
    admin3_id: number
    timezone: string
    population?: number
    country_id: number
    country: string
    admin1: string
    admin2: string
    admin3: string
}

export interface WeatherAPIResponse {
    latitude: number
    longitude: number
    generationtime_ms: number
    utc_offset_seconds: number
    timezone: string
    timezone_abbreviation: string
    elevation: number
    hourly_units: HourlyUnits
    hourly: Hourly
  }
  
  export interface HourlyUnits {
    time: string
    temperature_2m: string
  }
  
  export interface Hourly {
    time: string[]
    temperature_2m: number[]
  }

const geocoding_api = (location: string): string => `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=2&language=en&format=json`;
const weather_api = (latitude: string, longitude: string, unit: 'celsius' | 'fahrenheit') => `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&temperature_unit=${unit}`

export const get_current_weather = async (params: { location: string; unit: 'celsius' | 'fahrenheit' }) => {
    const response = await fetch(geocoding_api(params.location));
    const geocodes = await response.json() as GeocodingAPIResponse;
    
    const _response = await fetch(weather_api(`${geocodes.results[0].latitude}`, `${geocodes.results[0].longitude}`, params.unit))
    return await _response.json() as WeatherAPIResponse;
}