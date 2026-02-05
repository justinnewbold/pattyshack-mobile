import { create } from 'zustand';

// POS Integration Library
// Supports: Square, Toast, Clover, and generic POS systems

export interface POSConfig {
  provider: 'square' | 'toast' | 'clover' | 'generic';
  apiKey?: string;
  locationId?: string;
  merchantId?: string;
  webhookUrl?: string;
  isConnected: boolean;
}

export interface SaleItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total: number;
  modifiers?: string[];
}

export interface Sale {
  id: string;
  created_at: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile' | 'gift_card';
  employee_id?: string;
  employee_name?: string;
  order_type: 'dine_in' | 'takeout' | 'delivery' | 'drive_thru';
}

export interface POSSummary {
  total_sales: number;
  transaction_count: number;
  average_ticket: number;
  top_items: { name: string; quantity: number; revenue: number }[];
  hourly_sales: { hour: number; sales: number; transactions: number }[];
  payment_breakdown: { method: string; amount: number; count: number }[];
}

interface POSState {
  config: POSConfig | null;
  recentSales: Sale[];
  todaySummary: POSSummary | null;
  isLoading: boolean;
  error: string | null;
  configure: (config: POSConfig) => Promise<void>;
  disconnect: () => void;
  fetchRecentSales: (limit?: number) => Promise<void>;
  fetchDailySummary: (date?: string) => Promise<void>;
  syncInventory: () => Promise<void>;
}

// Mock data for demo
const MOCK_SALES: Sale[] = [
  {
    id: 'sale-001',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    items: [
      { id: '1', name: 'Classic Burger', category: 'Burgers', quantity: 2, unit_price: 8.99, total: 17.98 },
      { id: '2', name: 'Loaded Fries', category: 'Sides', quantity: 1, unit_price: 5.99, total: 5.99 },
      { id: '3', name: 'Soft Drink', category: 'Beverages', quantity: 2, unit_price: 2.49, total: 4.98 },
    ],
    subtotal: 28.95,
    tax: 2.03,
    discount: 0,
    total: 30.98,
    payment_method: 'card',
    employee_name: 'Sarah M.',
    order_type: 'dine_in',
  },
  {
    id: 'sale-002',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    items: [
      { id: '4', name: 'Bacon Cheeseburger', category: 'Burgers', quantity: 1, unit_price: 10.99, total: 10.99 },
      { id: '5', name: 'Onion Rings', category: 'Sides', quantity: 1, unit_price: 4.99, total: 4.99 },
    ],
    subtotal: 15.98,
    tax: 1.12,
    discount: 0,
    total: 17.10,
    payment_method: 'cash',
    employee_name: 'Mike T.',
    order_type: 'takeout',
  },
];

const MOCK_SUMMARY: POSSummary = {
  total_sales: 4523.87,
  transaction_count: 187,
  average_ticket: 24.19,
  top_items: [
    { name: 'Classic Burger', quantity: 89, revenue: 800.11 },
    { name: 'Bacon Cheeseburger', quantity: 67, revenue: 736.33 },
    { name: 'Loaded Fries', quantity: 112, revenue: 670.88 },
    { name: 'Chicken Sandwich', quantity: 45, revenue: 449.55 },
    { name: 'Milkshake', quantity: 78, revenue: 389.22 },
  ],
  hourly_sales: [
    { hour: 10, sales: 245.50, transactions: 12 },
    { hour: 11, sales: 567.80, transactions: 28 },
    { hour: 12, sales: 892.45, transactions: 45 },
    { hour: 13, sales: 756.30, transactions: 38 },
    { hour: 14, sales: 445.20, transactions: 22 },
    { hour: 15, sales: 312.60, transactions: 15 },
    { hour: 16, sales: 423.75, transactions: 18 },
    { hour: 17, sales: 534.90, transactions: 25 },
    { hour: 18, sales: 345.37, transactions: 14 },
  ],
  payment_breakdown: [
    { method: 'card', amount: 3254.12, count: 142 },
    { method: 'cash', amount: 892.50, count: 35 },
    { method: 'mobile', amount: 312.25, count: 8 },
    { method: 'gift_card', amount: 65.00, count: 2 },
  ],
};

export const usePOS = create<POSState>((set, get) => ({
  config: null,
  recentSales: [],
  todaySummary: null,
  isLoading: false,
  error: null,

  configure: async (config: POSConfig) => {
    set({ isLoading: true, error: null });

    try {
      // In production, validate API connection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      set({
        config: { ...config, isConnected: true },
        isLoading: false,
      });

      // Auto-fetch data after connection
      get().fetchRecentSales();
      get().fetchDailySummary();
    } catch (error) {
      set({
        error: 'Failed to connect to POS system',
        isLoading: false,
      });
    }
  },

  disconnect: () => {
    set({
      config: null,
      recentSales: [],
      todaySummary: null,
    });
  },

  fetchRecentSales: async (limit = 50) => {
    set({ isLoading: true });

    try {
      // In production, call POS API
      await new Promise((resolve) => setTimeout(resolve, 500));

      set({
        recentSales: MOCK_SALES,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: 'Failed to fetch sales data',
        isLoading: false,
      });
    }
  },

  fetchDailySummary: async (date?: string) => {
    set({ isLoading: true });

    try {
      // In production, call POS API
      await new Promise((resolve) => setTimeout(resolve, 500));

      set({
        todaySummary: MOCK_SUMMARY,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: 'Failed to fetch daily summary',
        isLoading: false,
      });
    }
  },

  syncInventory: async () => {
    set({ isLoading: true });

    try {
      // In production, sync inventory counts with POS
      await new Promise((resolve) => setTimeout(resolve, 1000));
      set({ isLoading: false });
    } catch (error) {
      set({
        error: 'Failed to sync inventory',
        isLoading: false,
      });
    }
  },
}));

// Helper functions
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function getPaymentIcon(method: Sale['payment_method']): string {
  switch (method) {
    case 'card': return 'card';
    case 'cash': return 'cash';
    case 'mobile': return 'phone-portrait';
    case 'gift_card': return 'gift';
    default: return 'wallet';
  }
}

export function getOrderTypeIcon(type: Sale['order_type']): string {
  switch (type) {
    case 'dine_in': return 'restaurant';
    case 'takeout': return 'bag-handle';
    case 'delivery': return 'car';
    case 'drive_thru': return 'car-sport';
    default: return 'receipt';
  }
}
