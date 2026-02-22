import { apiClient } from "./api";

// ── Local type definitions (avoids Vite module cache issues) ──
interface WeatherRequestPayload {
  city: string;
  country: string;
}

interface WeatherUpdatePayload {
  label?: string | null;
  notes?: string | null;
}

interface ReverseGeocodeResponse {
  city: string;
  country: string;
}

interface HealthResponse {
  status: string;
  database: string;
}

interface CurrentWeather {
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_main: string;
  weather_description: string;
  retrieved_at: string;
}

interface ForecastDay {
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

// ── API calls ──────────────────────────────────────────────────

const BASE = "/api/v1/weather";

export async function fetchWeather(payload: WeatherRequestPayload): Promise<WeatherResponse> {
  const { data } = await apiClient.post<WeatherResponse>(`${BASE}/`, payload);
  return data;
}

export async function getHistory(): Promise<WeatherResponse[]> {
  const { data } = await apiClient.get<WeatherResponse[]>(`${BASE}/history`);
  return data;
}

export async function patchWeatherRequest(
  id: string,
  payload: WeatherUpdatePayload
): Promise<WeatherResponse> {
  const { data } = await apiClient.patch<WeatherResponse>(`${BASE}/${id}`, payload);
  return data;
}

export async function deleteWeatherRequest(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<ReverseGeocodeResponse> {
  const { data } = await apiClient.get<ReverseGeocodeResponse>(
    `${BASE}/reverse-geocode`,
    { params: { lat, lon } }
  );
  return data;
}

export async function exportCsv(city?: string): Promise<void> {
  const params: Record<string, string> = { format: "csv" };
  if (city) params.city = city;

  const response = await apiClient.get(`${BASE}/export`, {
    params,
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = city ? `weather_export_${city.toLowerCase()}.csv` : "weather_export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function pingHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}