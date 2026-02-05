import { create } from 'zustand';

export interface WeatherData {
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  visibility: number;
  conditions: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';
}

export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  conditions: WeatherData['conditions'];
  precipitation_chance: number;
}

export interface WeatherAlert {
  id: string;
  type: 'warning' | 'watch' | 'advisory';
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  start_time: string;
  end_time: string;
}

interface WeatherState {
  current: WeatherData | null;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
  fetchWeather: (lat: number, lon: number) => Promise<void>;
  getStaffingImpact: () => { message: string; adjustment: number } | null;
}

// Mock weather data for demo
const MOCK_WEATHER: WeatherData = {
  temperature: 42,
  feels_like: 38,
  humidity: 65,
  description: 'Partly Cloudy',
  icon: 'partly-sunny',
  wind_speed: 12,
  visibility: 10,
  conditions: 'cloudy',
};

const MOCK_FORECAST: WeatherForecast[] = [
  { date: '2025-01-29', high: 45, low: 30, conditions: 'cloudy', precipitation_chance: 20 },
  { date: '2025-01-30', high: 38, low: 25, conditions: 'snow', precipitation_chance: 80 },
  { date: '2025-01-31', high: 35, low: 22, conditions: 'clear', precipitation_chance: 5 },
  { date: '2025-02-01', high: 40, low: 28, conditions: 'cloudy', precipitation_chance: 30 },
  { date: '2025-02-02', high: 48, low: 32, conditions: 'clear', precipitation_chance: 0 },
];

const MOCK_ALERTS: WeatherAlert[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Winter Storm Warning',
    description: 'Heavy snow expected Thursday. 4-8 inches accumulation. Travel may be hazardous.',
    severity: 'moderate',
    start_time: '2025-01-30T06:00:00',
    end_time: '2025-01-30T20:00:00',
  },
];

export const useWeather = create<WeatherState>((set, get) => ({
  current: null,
  forecast: [],
  alerts: [],
  lastUpdated: null,
  isLoading: false,
  error: null,

  fetchWeather: async (lat: number, lon: number) => {
    set({ isLoading: true, error: null });

    try {
      // In production, call actual weather API
      // const response = await fetch(`https://api.openweathermap.org/data/2.5/...`);

      // For demo, use mock data
      await new Promise((resolve) => setTimeout(resolve, 500));

      set({
        current: MOCK_WEATHER,
        forecast: MOCK_FORECAST,
        alerts: MOCK_ALERTS,
        lastUpdated: new Date().toISOString(),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: 'Failed to fetch weather data',
        isLoading: false,
      });
    }
  },

  getStaffingImpact: () => {
    const { current, alerts, forecast } = get();

    if (!current) return null;

    // Check for severe weather alerts
    const severeAlert = alerts.find((a) =>
      a.severity === 'severe' || a.severity === 'extreme'
    );
    if (severeAlert) {
      return {
        message: `${severeAlert.title}: Consider reducing staff or closing early`,
        adjustment: -30,
      };
    }

    // Check for snow/storm
    if (current.conditions === 'snow' || current.conditions === 'storm') {
      return {
        message: 'Weather may reduce customer traffic by 20-40%',
        adjustment: -25,
      };
    }

    // Check for extreme cold
    if (current.temperature < 20) {
      return {
        message: 'Cold weather may reduce foot traffic',
        adjustment: -15,
      };
    }

    // Check for rain
    if (current.conditions === 'rain') {
      return {
        message: 'Rain may slightly reduce customer traffic',
        adjustment: -10,
      };
    }

    // Perfect weather bonus
    if (current.conditions === 'clear' && current.temperature >= 60 && current.temperature <= 80) {
      return {
        message: 'Great weather! Expect higher than normal traffic',
        adjustment: 15,
      };
    }

    return null;
  },
}));

// Weather icon mapping
export function getWeatherIcon(conditions: WeatherData['conditions']): string {
  switch (conditions) {
    case 'clear': return 'sunny';
    case 'cloudy': return 'cloudy';
    case 'rain': return 'rainy';
    case 'snow': return 'snow';
    case 'storm': return 'thunderstorm';
    case 'fog': return 'cloudy-night';
    default: return 'partly-sunny';
  }
}

// Temperature color
export function getTemperatureColor(temp: number): string {
  if (temp >= 80) return '#ef4444'; // Hot - red
  if (temp >= 60) return '#22c55e'; // Nice - green
  if (temp >= 40) return '#3b82f6'; // Cool - blue
  if (temp >= 20) return '#6366f1'; // Cold - indigo
  return '#8b5cf6'; // Freezing - purple
}

// Format temperature
export function formatTemperature(temp: number, unit: 'F' | 'C' = 'F'): string {
  if (unit === 'C') {
    const celsius = Math.round((temp - 32) * (5 / 9));
    return `${celsius}°C`;
  }
  return `${Math.round(temp)}°F`;
}
