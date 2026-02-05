import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_quantity: number;
  counted_quantity?: number;
  unit: string;
  par_level: number;
  vendor: string;
}

const SAMPLE_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Burger Patties', category: 'Proteins', current_quantity: 150, unit: 'each', par_level: 200, vendor: 'Sysco' },
  { id: '2', name: 'Chicken Breast', category: 'Proteins', current_quantity: 45, unit: 'lbs', par_level: 60, vendor: 'Sysco' },
  { id: '3', name: 'Burger Buns', category: 'Bread', current_quantity: 120, unit: 'each', par_level: 150, vendor: 'US Foods' },
  { id: '4', name: 'Hot Dog Buns', category: 'Bread', current_quantity: 80, unit: 'each', par_level: 100, vendor: 'US Foods' },
  { id: '5', name: 'Lettuce', category: 'Produce', current_quantity: 8, unit: 'heads', par_level: 15, vendor: 'Sysco' },
  { id: '6', name: 'Tomatoes', category: 'Produce', current_quantity: 12, unit: 'lbs', par_level: 20, vendor: 'Sysco' },
  { id: '7', name: 'Onions', category: 'Produce', current_quantity: 10, unit: 'lbs', par_level: 15, vendor: 'Sysco' },
  { id: '8', name: 'Pickles', category: 'Condiments', current_quantity: 6, unit: 'jars', par_level: 10, vendor: 'US Foods' },
  { id: '9', name: 'Ketchup', category: 'Condiments', current_quantity: 8, unit: 'bottles', par_level: 12, vendor: 'US Foods' },
  { id: '10', name: 'Mustard', category: 'Condiments', current_quantity: 5, unit: 'bottles', par_level: 8, vendor: 'US Foods' },
  { id: '11', name: 'French Fries', category: 'Frozen', current_quantity: 25, unit: 'lbs', par_level: 50, vendor: 'Sysco' },
  { id: '12', name: 'Chicken Tenders', category: 'Frozen', current_quantity: 18, unit: 'lbs', par_level: 30, vendor: 'Sysco' },
  { id: '13', name: 'Cheese Slices', category: 'Dairy', current_quantity: 200, unit: 'slices', par_level: 300, vendor: 'Sysco' },
  { id: '14', name: 'Napkins', category: 'Supplies', current_quantity: 500, unit: 'each', par_level: 1000, vendor: 'US Foods' },
  { id: '15', name: 'To-Go Containers', category: 'Supplies', current_quantity: 150, unit: 'each', par_level: 300, vendor: 'US Foods' },
];

export default function InventoryCountScreen() {
  const router = useRouter();
  const { user, currentLocation } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>(SAMPLE_INVENTORY);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countedItems, setCountedItems] = useState<Map<string, number>>(new Map());

  const categories = [...new Set(inventory.map((i) => i.category))];

  const filteredInventory = inventory.filter((item) => {
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const updateCount = (itemId: string, count: string) => {
    const numCount = parseInt(count, 10);
    if (!isNaN(numCount) && numCount >= 0) {
      setCountedItems((prev) => new Map(prev).set(itemId, numCount));
    } else if (count === '') {
      setCountedItems((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (countedItems.size === 0) {
      Alert.alert('No Counts', 'Please enter at least one inventory count.');
      return;
    }

    Alert.alert(
      'Submit Count',
      `You are about to submit counts for ${countedItems.size} items. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              // In real app, save to database
              const updates = Array.from(countedItems.entries()).map(([itemId, count]) => ({
                item_id: itemId,
                counted_quantity: count,
                counted_by: user?.id,
                counted_at: new Date().toISOString(),
                location_id: currentLocation?.id,
              }));

              // Simulate API call
              await new Promise((resolve) => setTimeout(resolve, 1000));

              Alert.alert('Success', 'Inventory count submitted successfully!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to submit inventory count.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const getStockStatus = (current: number, par: number) => {
    const ratio = current / par;
    if (ratio <= 0.25) return { color: Colors.error, text: 'Critical' };
    if (ratio <= 0.5) return { color: Colors.warning, text: 'Low' };
    return { color: Colors.success, text: 'OK' };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const lowStockCount = inventory.filter((i) => i.current_quantity / i.par_level <= 0.5).length;
  const countedCount = countedItems.size;

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{inventory.length}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>{countedCount}</Text>
          <Text style={styles.statLabel}>Counted</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search items..."
          placeholderTextColor={Colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Inventory List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {filteredInventory.map((item) => {
          const status = getStockStatus(item.current_quantity, item.par_level);
          const countedValue = countedItems.get(item.id);

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                </View>
                <View style={[styles.stockBadge, { backgroundColor: status.color + '20' }]}>
                  <View style={[styles.stockDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.stockText, { color: status.color }]}>{status.text}</Text>
                </View>
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Current</Text>
                  <Text style={styles.detailValue}>
                    {item.current_quantity} {item.unit}
                  </Text>
                </View>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Par Level</Text>
                  <Text style={styles.detailValue}>
                    {item.par_level} {item.unit}
                  </Text>
                </View>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Count</Text>
                  <TextInput
                    style={[
                      styles.countInput,
                      countedValue !== undefined && styles.countInputFilled,
                    ]}
                    value={countedValue?.toString() || ''}
                    onChangeText={(text) => updateCount(item.id, text)}
                    keyboardType="numeric"
                    placeholder="-"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>

              {countedValue !== undefined && countedValue !== item.current_quantity && (
                <View style={styles.varianceRow}>
                  <Ionicons
                    name={countedValue > item.current_quantity ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color={countedValue > item.current_quantity ? Colors.success : Colors.error}
                  />
                  <Text
                    style={[
                      styles.varianceText,
                      {
                        color: countedValue > item.current_quantity ? Colors.success : Colors.error,
                      },
                    ]}
                  >
                    {Math.abs(countedValue - item.current_quantity)} {item.unit}{' '}
                    {countedValue > item.current_quantity ? 'more' : 'less'} than expected
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || countedItems.size === 0}
        >
          <Ionicons name="checkmark-circle" size={24} color={Colors.textOnPrimary} />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : `Submit Count (${countedItems.size} items)`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  categoryScroll: {
    maxHeight: 45,
    marginBottom: Spacing.sm,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  categoryChipTextActive: {
    color: Colors.textOnPrimary,
  },
  list: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  itemCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  itemCategory: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  stockText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailColumn: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  countInput: {
    width: 60,
    textAlign: 'center',
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  varianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  varianceText: {
    fontSize: FontSizes.sm,
    marginLeft: Spacing.xs,
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
