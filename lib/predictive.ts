import { create } from 'zustand';
import { useWeather } from './weather';

// Predictive Staffing Library
// Uses historical data, weather, and events to recommend staffing levels

export interface StaffingRecommendation {
  date: string;
  dayOfWeek: string;
  hour: number;
  predicted_sales: number;
  recommended_staff: number;
  current_scheduled: number;
  difference: number;
  confidence: number;
  factors: string[];
}

export interface DailyForecast {
  date: string;
  predicted_revenue: number;
  predicted_transactions: number;
  recommended_labor_hours: number;
  peak_hours: number[];
  events: string[];
  weather_impact: number;
}

interface PredictiveState {
  recommendations: StaffingRecommendation[];
  weekForecast: DailyForecast[];
  isLoading: boolean;
  lastUpdated: string | null;
  fetchRecommendations: (date: string) => Promise<void>;
  fetchWeekForecast: () => Promise<void>;
  getOptimalSchedule: (date: string) => StaffingRecommendation[];
}

// Mock historical patterns
const HOURLY_PATTERNS: Record<number, Record<number, number>> = {
  0: { 10: 0.3, 11: 0.6, 12: 1.0, 13: 0.9, 14: 0.5, 15: 0.4, 16: 0.5, 17: 0.7, 18: 0.8, 19: 0.6, 20: 0.4 }, // Sunday
  1: { 10: 0.4, 11: 0.7, 12: 0.9, 13: 0.8, 14: 0.4, 15: 0.3, 16: 0.4, 17: 0.6, 18: 0.5, 19: 0.4, 20: 0.3 }, // Monday
  2: { 10: 0.4, 11: 0.7, 12: 0.9, 13: 0.8, 14: 0.4, 15: 0.3, 16: 0.4, 17: 0.6, 18: 0.5, 19: 0.4, 20: 0.3 }, // Tuesday
  3: { 10: 0.4, 11: 0.7, 12: 0.9, 13: 0.8, 14: 0.5, 15: 0.4, 16: 0.5, 17: 0.6, 18: 0.5, 19: 0.4, 20: 0.3 }, // Wednesday
  4: { 10: 0.5, 11: 0.8, 12: 1.0, 13: 0.9, 14: 0.5, 15: 0.4, 16: 0.5, 17: 0.7, 18: 0.6, 19: 0.5, 20: 0.4 }, // Thursday
  5: { 10: 0.6, 11: 0.9, 12: 1.0, 13: 1.0, 14: 0.7, 15: 0.6, 16: 0.7, 17: 0.9, 18: 1.0, 19: 0.9, 20: 0.7 }, // Friday
  6: { 10: 0.5, 11: 0.8, 12: 1.0, 13: 1.0, 14: 0.8, 15: 0.6, 16: 0.7, 17: 0.9, 18: 1.0, 19: 0.8, 20: 0.6 }, // Saturday
};

const BASE_HOURLY_SALES = 450; // Average hourly sales
const STAFF_PER_100_SALES = 0.8; // Staff needed per $100 in sales

export const usePredictive = create<PredictiveState>((set, get) => ({
  recommendations: [],
  weekForecast: [],
  isLoading: false,
  lastUpdated: null,

  fetchRecommendations: async (date: string) => {
    set({ isLoading: true });

    try {
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();
      const pattern = HOURLY_PATTERNS[dayOfWeek];

      // Get weather impact
      const weatherStore = useWeather.getState();
      const weatherImpact = weatherStore.getStaffingImpact();
      const weatherAdjustment = weatherImpact ? weatherImpact.adjustment / 100 : 0;

      const recommendations: StaffingRecommendation[] = [];

      for (let hour = 10; hour <= 20; hour++) {
        const baseMultiplier = pattern[hour] || 0.5;
        const adjustedMultiplier = baseMultiplier * (1 + weatherAdjustment);
        const predictedSales = BASE_HOURLY_SALES * adjustedMultiplier;
        const recommendedStaff = Math.ceil((predictedSales / 100) * STAFF_PER_100_SALES);

        // Mock current scheduled (would come from actual schedule)
        const currentScheduled = Math.floor(Math.random() * 3) + 3;

        const factors: string[] = [];
        if (dayOfWeek === 5 || dayOfWeek === 6) factors.push('Weekend');
        if (hour >= 11 && hour <= 13) factors.push('Lunch rush');
        if (hour >= 17 && hour <= 19) factors.push('Dinner rush');
        if (weatherAdjustment !== 0) factors.push('Weather impact');

        recommendations.push({
          date,
          dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
          hour,
          predicted_sales: Math.round(predictedSales),
          recommended_staff: recommendedStaff,
          current_scheduled: currentScheduled,
          difference: recommendedStaff - currentScheduled,
          confidence: 0.85 + Math.random() * 0.1,
          factors,
        });
      }

      set({
        recommendations,
        lastUpdated: new Date().toISOString(),
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  fetchWeekForecast: async () => {
    set({ isLoading: true });

    try {
      const forecasts: DailyForecast[] = [];
      const today = new Date();

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dayOfWeek = date.getDay();

        // Calculate daily totals
        const pattern = HOURLY_PATTERNS[dayOfWeek];
        let dailySales = 0;
        const peakHours: number[] = [];

        Object.entries(pattern).forEach(([hour, multiplier]) => {
          const hourlySales = BASE_HOURLY_SALES * multiplier;
          dailySales += hourlySales;
          if (multiplier >= 0.9) peakHours.push(parseInt(hour));
        });

        // Events (would come from calendar integration)
        const events: string[] = [];
        if (dayOfWeek === 0) events.push('Super Bowl Sunday');
        if (date.getDate() === 14 && date.getMonth() === 1) events.push("Valentine's Day");

        forecasts.push({
          date: date.toISOString().split('T')[0],
          predicted_revenue: Math.round(dailySales),
          predicted_transactions: Math.round(dailySales / 24),
          recommended_labor_hours: Math.round((dailySales / 100) * STAFF_PER_100_SALES * 11),
          peak_hours: peakHours,
          events,
          weather_impact: 0,
        });
      }

      set({
        weekForecast: forecasts,
        lastUpdated: new Date().toISOString(),
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  getOptimalSchedule: (date: string) => {
    const { recommendations } = get();
    return recommendations.filter((r) => r.date === date);
  },
}));

// Helper functions
export function getStaffingStatus(diff: number): 'understaffed' | 'optimal' | 'overstaffed' {
  if (diff > 0) return 'understaffed';
  if (diff < 0) return 'overstaffed';
  return 'optimal';
}

export function getStaffingColor(diff: number): string {
  if (diff > 1) return '#ef4444'; // Red - significantly understaffed
  if (diff > 0) return '#f97316'; // Orange - slightly understaffed
  if (diff < -1) return '#3b82f6'; // Blue - overstaffed
  return '#22c55e'; // Green - optimal
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
