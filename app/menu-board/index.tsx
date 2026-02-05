import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
}

interface MenuBoard {
  id: string;
  name: string;
  location: string;
  isOnline: boolean;
  lastSync: string;
}

const SAMPLE_ITEMS: MenuItem[] = [
  { id: '1', name: 'Classic Burger', category: 'Burgers', price: 8.99, isAvailable: true, isFeatured: true, displayOrder: 1 },
  { id: '2', name: 'Bacon Cheeseburger', category: 'Burgers', price: 10.99, isAvailable: true, isFeatured: false, displayOrder: 2 },
  { id: '3', name: 'Veggie Burger', category: 'Burgers', price: 9.99, isAvailable: true, isFeatured: false, displayOrder: 3 },
  { id: '4', name: 'Loaded Fries', category: 'Sides', price: 5.99, isAvailable: true, isFeatured: true, displayOrder: 4 },
  { id: '5', name: 'Onion Rings', category: 'Sides', price: 4.99, isAvailable: false, isFeatured: false, displayOrder: 5 },
  { id: '6', name: 'Milkshake', category: 'Beverages', price: 4.99, isAvailable: true, isFeatured: false, displayOrder: 6 },
  { id: '7', name: 'Soft Drink', category: 'Beverages', price: 2.49, isAvailable: true, isFeatured: false, displayOrder: 7 },
];

const SAMPLE_BOARDS: MenuBoard[] = [
  { id: '1', name: 'Front Counter Display', location: 'Main Counter', isOnline: true, lastSync: '2025-01-28T14:30:00' },
  { id: '2', name: 'Drive-Thru Board 1', location: 'Drive-Thru', isOnline: true, lastSync: '2025-01-28T14:30:00' },
  { id: '3', name: 'Drive-Thru Board 2', location: 'Drive-Thru', isOnline: false, lastSync: '2025-01-28T10:15:00' },
];

export default function MenuBoardScreen() {
  const { user } = useStore();
  const [items, setItems] = useState<MenuItem[]>(SAMPLE_ITEMS);
  const [boards, setBoards] = useState<MenuBoard[]>(SAMPLE_BOARDS);
  const [activeTab, setActiveTab] = useState<'items' | 'boards' | 'promotions'>('items');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [...new Set(items.map((i) => i.category))];

  const toggleAvailability = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
    syncBoards();
  };

  const toggleFeatured = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isFeatured: !item.isFeatured } : item
      )
    );
    syncBoards();
  };

  const updatePrice = (itemId: string, newPrice: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, price: newPrice } : item
      )
    );
    setEditingItem(null);
    syncBoards();
  };

  const syncBoards = () => {
    Alert.alert('Syncing', 'Menu changes are being pushed to all display boards...');
    setBoards((prev) =>
      prev.map((board) => ({
        ...board,
        lastSync: new Date().toISOString(),
      }))
    );
  };

  const rebootBoard = (boardId: string) => {
    Alert.alert(
      'Reboot Display',
      'Are you sure you want to reboot this display board?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reboot',
          onPress: () => {
            Alert.alert('Rebooting', 'Display board is restarting...');
          },
        },
      ]
    );
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineBoards = boards.filter((b) => b.isOnline).length;

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
          <Text style={styles.summaryValue}>{onlineBoards}/{boards.length}</Text>
          <Text style={styles.summaryLabel}>Boards Online</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.warning }]}>
          <Text style={styles.summaryValue}>
            {items.filter((i) => !i.isAvailable).length}
          </Text>
          <Text style={styles.summaryLabel}>Items 86'd</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['items', 'boards', 'promotions'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'items' && (
        <>
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
          </View>

          <ScrollView style={styles.itemsList}>
            {categories.map((category) => (
              <View key={category}>
                <Text style={styles.categoryHeader}>{category}</Text>
                {filteredItems
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <View
                      key={item.id}
                      style={[styles.itemCard, !item.isAvailable && styles.itemUnavailable]}
                    >
                      <View style={styles.itemInfo}>
                        <View style={styles.itemNameRow}>
                          <Text style={[styles.itemName, !item.isAvailable && styles.itemNameUnavailable]}>
                            {item.name}
                          </Text>
                          {item.isFeatured && (
                            <View style={styles.featuredBadge}>
                              <Ionicons name="star" size={12} color={Colors.warning} />
                            </View>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => setEditingItem(item)}>
                          <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.itemControls}>
                        <TouchableOpacity
                          style={[styles.controlButton, item.isFeatured && styles.controlButtonActive]}
                          onPress={() => toggleFeatured(item.id)}
                        >
                          <Ionicons
                            name="star"
                            size={18}
                            color={item.isFeatured ? Colors.warning : Colors.textLight}
                          />
                        </TouchableOpacity>
                        <View style={styles.availabilityToggle}>
                          <Switch
                            value={item.isAvailable}
                            onValueChange={() => toggleAvailability(item.id)}
                            trackColor={{ false: Colors.error + '50', true: Colors.success + '50' }}
                            thumbColor={item.isAvailable ? Colors.success : Colors.error}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {activeTab === 'boards' && (
        <ScrollView style={styles.boardsList}>
          {boards.map((board) => (
            <View key={board.id} style={styles.boardCard}>
              <View style={styles.boardHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: board.isOnline ? Colors.success : Colors.error }]} />
                <View style={styles.boardInfo}>
                  <Text style={styles.boardName}>{board.name}</Text>
                  <Text style={styles.boardLocation}>{board.location}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: board.isOnline ? Colors.success + '20' : Colors.error + '20' }]}>
                  <Text style={[styles.statusText, { color: board.isOnline ? Colors.success : Colors.error }]}>
                    {board.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
              <View style={styles.boardFooter}>
                <Text style={styles.lastSync}>
                  Last sync: {new Date(board.lastSync).toLocaleTimeString()}
                </Text>
                <View style={styles.boardActions}>
                  <TouchableOpacity style={styles.boardAction} onPress={syncBoards}>
                    <Ionicons name="sync" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.boardAction} onPress={() => rebootBoard(board.id)}>
                    <Ionicons name="power" size={18} color={Colors.warning} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'promotions' && (
        <View style={styles.promotionsContainer}>
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Promotions</Text>
            <Text style={styles.emptyText}>Create and manage promotional content for your menu boards</Text>
            <TouchableOpacity style={styles.createButton}>
              <Ionicons name="add" size={24} color={Colors.textOnPrimary} />
              <Text style={styles.createButtonText}>Create Promotion</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sync All Button */}
      <TouchableOpacity style={styles.syncAllButton} onPress={syncBoards}>
        <Ionicons name="sync" size={24} color={Colors.textOnPrimary} />
        <Text style={styles.syncAllText}>Sync All Boards</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  summaryCard: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderLeftWidth: 4 },
  summaryValue: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  tabTextActive: { color: Colors.textOnPrimary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  itemsList: { flex: 1, padding: Spacing.md, paddingTop: 0 },
  categoryHeader: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  itemUnavailable: { opacity: 0.6 },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  itemName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  itemNameUnavailable: { textDecorationLine: 'line-through' },
  featuredBadge: { backgroundColor: Colors.warning + '20', padding: 2, borderRadius: BorderRadius.sm },
  itemPrice: { fontSize: FontSizes.md, color: Colors.primary, fontWeight: '600' },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  controlButton: { padding: Spacing.sm },
  controlButtonActive: { backgroundColor: Colors.warning + '20', borderRadius: BorderRadius.md },
  availabilityToggle: {},
  boardsList: { flex: 1, padding: Spacing.md },
  boardCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  boardHeader: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 12, height: 12, borderRadius: 6 },
  boardInfo: { flex: 1, marginLeft: Spacing.md },
  boardName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  boardLocation: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  boardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  lastSync: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  boardActions: { flexDirection: 'row', gap: Spacing.md },
  boardAction: { padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md },
  promotionsContainer: { flex: 1, padding: Spacing.md },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '600', color: Colors.text, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.lg },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  createButtonText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textOnPrimary },
  syncAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  syncAllText: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.textOnPrimary },
});
