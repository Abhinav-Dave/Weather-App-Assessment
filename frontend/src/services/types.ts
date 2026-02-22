export interface WeatherRequestPayload {
  city: string;
  country: string;
}

export interface WeatherUpdatePayload {
  label?: string | null;
  notes?: string | null;
}

export interface ReverseGeocodeResponse {
  city: string;
  country: string;
}

export interface HealthResponse {
  status: string;
  database: string;
}

export interface CurrentWeather {
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_main: string;
  weather_description: string;
  retrieved_at: string;
}

export interface ForecastDay {
  forecast_date: string;
  temp_min: number;
  temp_max: number;
  temp_avg: number;
  humidity_avg: number;
  weather_main: string;
  weather_description: string;
}

export interface WeatherResponse {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  current: CurrentWeather;
  forecast: ForecastDay[];
  cached: boolean;
  created_at: string;
  label: string | null;
  notes: string | null;
}