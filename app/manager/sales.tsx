import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface SalesData {
  date: string;
  total_sales: number;
  transactions: number;
  average_ticket: number;
  labor_cost: number;
  labor_percent: number;
}

interface HourlySales {
  hour: number;
  sales: number;
  transactions: number;
}

// Sample data for demonstration
const SAMPLE_DAILY_DATA: SalesData[] = Array.from({ length: 7 }, (_, i) => {
  const date = subDays(new Date(), 6 - i);
  const baseSales = 2500 + Math.random() * 1500;
  const transactions = 80 + Math.floor(Math.random() * 40);
  return {
    date: format(date, 'yyyy-MM-dd'),
    total_sales: Math.round(baseSales * 100) / 100,
    transactions,
    average_ticket: Math.round((baseSales / transactions) * 100) / 100,
    labor_cost: Math.round(baseSales * (0.25 + Math.random() * 0.05) * 100) / 100,
    labor_percent: Math.round((25 + Math.random() * 5) * 10) / 10,
  };
});

const SAMPLE_HOURLY_DATA: HourlySales[] = [
  { hour: 10, sales: 245.50, transactions: 12 },
  { hour: 11, sales: 423.75, transactions: 18 },
  { hour: 12, sales: 687.25, transactions: 28 },
  { hour: 13, sales: 542.00, transactions: 22 },
  { hour: 14, sales: 312.50, transactions: 15 },
  { hour: 15, sales: 198.75, transactions: 10 },
  { hour: 16, sales: 287.25, transactions: 14 },
  { hour: 17, sales: 456.50, transactions: 19 },
  { hour: 18, sales: 623.00, transactions: 25 },
  { hour: 19, sales: 534.25, transactions: 21 },
  { hour: 20, sales: 398.75, transactions: 16 },
  { hour: 21, sales: 245.00, transactions: 12 },
];

export default function SalesDashboardScreen() {
  const { user, currentLocation } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [dailyData, setDailyData] = useState<SalesData[]>(SAMPLE_DAILY_DATA);
  const [hourlyData, setHourlyData] = useState<HourlySales[]>(SAMPLE_HOURLY_DATA);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch actual data from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const todayData = dailyData[dailyData.length - 1];
  const weekTotal = dailyData.reduce((sum, d) => sum + d.total_sales, 0);
  const weekTransactions = dailyData.reduce((sum, d) => sum + d.transactions, 0);
  const avgDailySales = weekTotal / dailyData.length;

  // Calculate max for chart scaling
  const maxHourlySales = Math.max(...hourlyData.map((h) => h.sales));
  const maxDailySales = Math.max(...dailyData.map((d) => d.total_sales));

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Check access
  if (user?.role !== 'manager' && user?.role !== 'gm' && user?.role !== 'corporate') {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color={Colors.textLight} />
        <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
        <Text style={styles.accessDeniedText}>
          Sales data is only available to managers.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales Dashboard</Text>
        <View style={styles.locationBadge}>
          <Ionicons name="storefront" size={14} color={Colors.primary} />
          <Text style={styles.locationText}>{currentLocation?.name}</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['today', 'week', 'month'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, styles.metricCardPrimary]}>
          <Ionicons name="cash-outline" size={24} color={Colors.textOnPrimary} />
          <Text style={styles.metricValuePrimary}>{formatCurrency(todayData?.total_sales || 0)}</Text>
          <Text style={styles.metricLabelPrimary}>Today's Sales</Text>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="receipt-outline" size={20} color={Colors.info} />
          <Text style={styles.metricValue}>{todayData?.transactions || 0}</Text>
          <Text style={styles.metricLabel}>Transactions</Text>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="pricetag-outline" size={20} color={Colors.success} />
          <Text style={styles.metricValue}>{formatCurrency(todayData?.average_ticket || 0)}</Text>
          <Text style={styles.metricLabel}>Avg Ticket</Text>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="people-outline" size={20} color={Colors.warning} />
          <Text style={styles.metricValue}>{todayData?.labor_percent || 0}%</Text>
          <Text style={styles.metricLabel}>Labor %</Text>
        </View>
      </View>

      {/* Hourly Sales Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hourly Sales</Text>
        <View style={styles.chartContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.barChart}>
              {hourlyData.map((hour, index) => (
                <View key={index} style={styles.barContainer}>
                  <Text style={styles.barValue}>${Math.round(hour.sales)}</Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: (hour.sales / maxHourlySales) * 120,
                        backgroundColor: hour.hour >= 11 && hour.hour <= 13 ? Colors.primary : Colors.info,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{formatHour(hour.hour)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Daily Sales Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.chartContainer}>
          <View style={styles.barChart}>
            {dailyData.map((day, index) => (
              <View key={index} style={styles.barContainer}>
                <Text style={styles.barValue}>${Math.round(day.total_sales / 100) * 100}</Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: (day.total_sales / maxDailySales) * 100,
                      backgroundColor: index === dailyData.length - 1 ? Colors.primary : Colors.info,
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{format(new Date(day.date), 'EEE')}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Week Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Week Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>{formatCurrency(weekTotal)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>{weekTransactions}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Daily Average</Text>
              <Text style={styles.summaryValue}>{formatCurrency(avgDailySales)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg Labor %</Text>
              <Text style={styles.summaryValue}>
                {Math.round(dailyData.reduce((sum, d) => sum + d.labor_percent, 0) / dailyData.length * 10) / 10}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Top Items (placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Selling Items</Text>
        {[
          { name: 'Classic Patty Burger', sold: 127, revenue: 1142.73 },
          { name: 'Double Patty Deluxe', sold: 89, revenue: 1067.11 },
          { name: 'Crispy Chicken Sandwich', sold: 76, revenue: 683.24 },
          { name: 'Loaded Fries', sold: 112, revenue: 559.88 },
          { name: 'Vanilla Shake', sold: 68, revenue: 339.32 },
        ].map((item, index) => (
          <View key={index} style={styles.topItemCard}>
            <View style={styles.topItemRank}>
              <Text style={styles.topItemRankText}>{index + 1}</Text>
            </View>
            <View style={styles.topItemInfo}>
              <Text style={styles.topItemName}>{item.name}</Text>
              <Text style={styles.topItemSold}>{item.sold} sold</Text>
            </View>
            <Text style={styles.topItemRevenue}>{formatCurrency(item.revenue)}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  periodButtonTextActive: {
    color: Colors.textOnPrimary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
  },
  metricCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: '1%',
    alignItems: 'center',
  },
  metricCardPrimary: {
    backgroundColor: Colors.primary,
    width: '98%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  metricValuePrimary: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textOnPrimary,
  },
  metricLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  metricLabelPrimary: {
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary + 'CC',
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    paddingTop: Spacing.lg,
  },
  barContainer: {
    alignItems: 'center',
    width: 50,
    marginHorizontal: Spacing.xs,
  },
  bar: {
    width: 32,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  barValue: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  barLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  topItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  topItemRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topItemRankText: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  topItemInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  topItemName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  topItemSold: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  topItemRevenue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.success,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  accessDeniedTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  accessDeniedText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
