import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface CateringOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  event_date: string;
  event_time: string;
  guest_count: number;
  order_items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  deposit_paid: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled';
  delivery_type: 'pickup' | 'delivery';
  delivery_address?: string;
  special_instructions?: string;
  created_at: string;
}

const SAMPLE_ORDERS: CateringOrder[] = [
  {
    id: '1',
    customer_name: 'Johnson Family Reunion',
    customer_phone: '(801) 555-1234',
    event_date: new Date().toISOString().split('T')[0],
    event_time: '12:00',
    guest_count: 50,
    order_items: [
      { name: 'Classic Burger Tray (20)', quantity: 2, price: 89.99 },
      { name: 'Loaded Fries Tray', quantity: 3, price: 34.99 },
      { name: 'Drink Cooler (24 cans)', quantity: 2, price: 29.99 },
    ],
    subtotal: 344.93,
    tax: 24.15,
    total: 369.08,
    deposit_paid: 100,
    status: 'preparing',
    delivery_type: 'pickup',
    special_instructions: 'Extra pickles on burgers please!',
    created_at: '2025-01-25',
  },
  {
    id: '2',
    customer_name: 'TechCorp Office Lunch',
    customer_phone: '(801) 555-5678',
    customer_email: 'events@techcorp.com',
    event_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    event_time: '11:30',
    guest_count: 30,
    order_items: [
      { name: 'Slider Tray (30)', quantity: 1, price: 79.99 },
      { name: 'Garden Salad Tray', quantity: 2, price: 44.99 },
      { name: 'Cookie Platter', quantity: 1, price: 24.99 },
    ],
    subtotal: 194.96,
    tax: 13.65,
    total: 208.61,
    deposit_paid: 208.61,
    status: 'confirmed',
    delivery_type: 'delivery',
    delivery_address: '123 Tech Blvd, Suite 400',
    created_at: '2025-01-26',
  },
];

export default function CateringScreen() {
  const { currentLocation } = useStore();
  const [orders, setOrders] = useState<CateringOrder[]>(SAMPLE_ORDERS);
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'all'>('upcoming');
  const [selectedOrder, setSelectedOrder] = useState<CateringOrder | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (filter === 'today') return isToday(parseISO(order.event_date));
    if (filter === 'upcoming') {
      const eventDate = parseISO(order.event_date);
      return eventDate >= new Date() && order.status !== 'completed' && order.status !== 'cancelled';
    }
    return true;
  });

  const updateOrderStatus = (orderId: string, newStatus: CateringOrder['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    setSelectedOrder(null);
    Alert.alert('Status Updated', `Order status changed to ${newStatus}`);
  };

  const getStatusColor = (status: CateringOrder['status']) => {
    switch (status) {
      case 'pending': return Colors.warning;
      case 'confirmed': return Colors.info;
      case 'preparing': return '#f97316';
      case 'ready': return Colors.success;
      case 'delivered': return Colors.success;
      case 'completed': return Colors.textSecondary;
      case 'cancelled': return Colors.error;
    }
  };

  const getDateLabel = (date: string) => {
    const eventDate = parseISO(date);
    if (isToday(eventDate)) return 'Today';
    if (isTomorrow(eventDate)) return 'Tomorrow';
    return format(eventDate, 'EEE, MMM d');
  };

  const todayRevenue = orders
    .filter((o) => isToday(parseISO(o.event_date)) && o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const upcomingCount = orders.filter((o) => {
    const eventDate = parseISO(o.event_date);
    return eventDate >= new Date() && o.status !== 'completed' && o.status !== 'cancelled';
  }).length;

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
          <Text style={styles.summaryValue}>${todayRevenue.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Today's Revenue</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.info }]}>
          <Text style={styles.summaryValue}>{upcomingCount}</Text>
          <Text style={styles.summaryLabel}>Upcoming Orders</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['upcoming', 'today', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      <ScrollView style={styles.ordersList}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>No catering orders</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => setSelectedOrder(order)}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderName}>{order.customer_name}</Text>
                  <Text style={styles.orderDate}>
                    {getDateLabel(order.event_date)} at {order.event_time}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="people" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{order.guest_count} guests</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name={order.delivery_type === 'delivery' ? 'car' : 'storefront'} size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="cash" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>${order.total.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.itemsPreview}>
                <Text style={styles.itemsPreviewText} numberOfLines={1}>
                  {order.order_items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedOrder.customer_name}</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Event Details</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={18} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {format(parseISO(selectedOrder.event_date), 'EEEE, MMMM d, yyyy')} at {selectedOrder.event_time}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="people" size={18} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>{selectedOrder.guest_count} guests</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name={selectedOrder.delivery_type === 'delivery' ? 'car' : 'storefront'} size={18} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {selectedOrder.delivery_type === 'delivery' ? `Delivery: ${selectedOrder.delivery_address}` : 'Customer Pickup'}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={18} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>{selectedOrder.customer_phone}</Text>
                </View>
                {selectedOrder.customer_email && (
                  <View style={styles.infoRow}>
                    <Ionicons name="mail" size={18} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{selectedOrder.customer_email}</Text>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                {selectedOrder.order_items.map((item, index) => (
                  <View key={index} style={styles.orderItemRow}>
                    <Text style={styles.orderItemQty}>{item.quantity}x</Text>
                    <Text style={styles.orderItemName}>{item.name}</Text>
                    <Text style={styles.orderItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.totalSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>${selectedOrder.subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax</Text>
                    <Text style={styles.totalValue}>${selectedOrder.tax.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.totalRow, styles.grandTotal]}>
                    <Text style={styles.grandTotalLabel}>Total</Text>
                    <Text style={styles.grandTotalValue}>${selectedOrder.total.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Deposit Paid</Text>
                    <Text style={[styles.totalValue, { color: Colors.success }]}>${selectedOrder.deposit_paid.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Balance Due</Text>
                    <Text style={[styles.totalValue, { color: Colors.warning }]}>
                      ${(selectedOrder.total - selectedOrder.deposit_paid).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedOrder.special_instructions && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Special Instructions</Text>
                  <Text style={styles.instructionsText}>{selectedOrder.special_instructions}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Update Status</Text>
                <View style={styles.statusButtons}>
                  {(['confirmed', 'preparing', 'ready', 'delivered', 'completed'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusButton, selectedOrder.status === status && { backgroundColor: getStatusColor(status) }]}
                      onPress={() => updateOrderStatus(selectedOrder.id, status)}
                    >
                      <Text style={[styles.statusButtonText, selectedOrder.status === status && { color: Colors.textOnPrimary }]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  summaryCard: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderLeftWidth: 4 },
  summaryValue: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  filterTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.background },
  filterTabActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  filterTextActive: { color: Colors.textOnPrimary },
  ordersList: { flex: 1, padding: Spacing.md },
  emptyState: { alignItems: 'center', padding: Spacing.xxl },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.md },
  orderCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  orderName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  orderDate: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textOnPrimary },
  orderDetails: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.sm },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  detailText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  itemsPreview: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  itemsPreviewText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  infoText: { fontSize: FontSizes.md, color: Colors.text },
  orderItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderItemQty: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.primary, width: 40 },
  orderItemName: { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  orderItemPrice: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  totalSection: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  totalLabel: { fontSize: FontSizes.md, color: Colors.textSecondary },
  totalValue: { fontSize: FontSizes.md, color: Colors.text },
  grandTotal: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  grandTotalLabel: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text },
  grandTotalValue: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  instructionsText: { fontSize: FontSizes.md, color: Colors.text, backgroundColor: Colors.warning + '15', padding: Spacing.md, borderRadius: BorderRadius.md },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statusButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md },
  statusButtonText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
});
