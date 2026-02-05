import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { format } from 'date-fns';

interface Review {
  id: string;
  source: 'google' | 'yelp' | 'internal';
  rating: number;
  author: string;
  text: string;
  date: string;
  response?: string;
  responded_at?: string;
}

const SAMPLE_REVIEWS: Review[] = [
  { id: '1', source: 'google', rating: 5, author: 'Sarah M.', text: 'Best burgers in town! The staff was super friendly and the food came out fast. Will definitely be back!', date: '2025-01-28' },
  { id: '2', source: 'yelp', rating: 4, author: 'Mike T.', text: 'Great food, decent prices. The fries were perfectly crispy. Only complaint is it was a bit loud.', date: '2025-01-27' },
  { id: '3', source: 'google', rating: 2, author: 'Jennifer L.', text: 'Waited 20 minutes for my order during lunch rush. Food was cold when I got it.', date: '2025-01-26', response: 'We apologize for your experience. We strive to serve hot, fresh food quickly. Please reach out to us directly so we can make this right.' },
  { id: '4', source: 'internal', rating: 5, author: 'Guest', text: 'The new loaded fries are amazing! Keep them on the menu!', date: '2025-01-25' },
  { id: '5', source: 'google', rating: 3, author: 'David R.', text: 'Food is good but parking is always a nightmare.', date: '2025-01-24' },
];

export default function CustomerFeedbackScreen() {
  const { currentLocation } = useStore();
  const [reviews, setReviews] = useState<Review[]>(SAMPLE_REVIEWS);
  const [filter, setFilter] = useState<'all' | 'google' | 'yelp' | 'internal'>('all');
  const [responseText, setResponseText] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const filteredReviews = reviews.filter((r) => filter === 'all' || r.source === filter);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percent: reviews.length > 0 ? (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100 : 0,
  }));

  const handleRespond = (reviewId: string) => {
    if (!responseText.trim()) return;

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, response: responseText, responded_at: new Date().toISOString() }
          : r
      )
    );
    setResponseText('');
    setRespondingTo(null);
  };

  const getSourceIcon = (source: Review['source']) => {
    switch (source) {
      case 'google': return 'logo-google';
      case 'yelp': return 'star';
      default: return 'chatbubble';
    }
  };

  const getSourceColor = (source: Review['source']) => {
    switch (source) {
      case 'google': return '#4285F4';
      case 'yelp': return '#d32323';
      default: return Colors.primary;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? '#FFB800' : Colors.textLight}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.ratingOverview}>
          <Text style={styles.averageRating}>{averageRating}</Text>
          {renderStars(Math.round(parseFloat(averageRating)))}
          <Text style={styles.totalReviews}>{reviews.length} reviews</Text>
        </View>
        <View style={styles.ratingBars}>
          {ratingDistribution.map((item) => (
            <View key={item.rating} style={styles.ratingBarRow}>
              <Text style={styles.ratingLabel}>{item.rating}</Text>
              <View style={styles.ratingBarBg}>
                <View style={[styles.ratingBarFill, { width: `${item.percent}%` }]} />
              </View>
              <Text style={styles.ratingCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Links */}
      <View style={styles.quickLinks}>
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => Linking.openURL('https://business.google.com')}
        >
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text style={styles.quickLinkText}>Google Business</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => Linking.openURL('https://biz.yelp.com')}
        >
          <Ionicons name="star" size={20} color="#d32323" />
          <Text style={styles.quickLinkText}>Yelp for Business</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['all', 'google', 'yelp', 'internal'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reviews List */}
      <ScrollView style={styles.reviewsList}>
        {filteredReviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={[styles.sourceIcon, { backgroundColor: getSourceColor(review.source) + '20' }]}>
                <Ionicons name={getSourceIcon(review.source) as any} size={16} color={getSourceColor(review.source)} />
              </View>
              <View style={styles.reviewMeta}>
                <Text style={styles.reviewAuthor}>{review.author}</Text>
                <Text style={styles.reviewDate}>{format(new Date(review.date), 'MMM d, yyyy')}</Text>
              </View>
              {renderStars(review.rating)}
            </View>

            <Text style={styles.reviewText}>{review.text}</Text>

            {review.response ? (
              <View style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <Ionicons name="business" size={16} color={Colors.primary} />
                  <Text style={styles.responseLabel}>Owner Response</Text>
                </View>
                <Text style={styles.responseText}>{review.response}</Text>
              </View>
            ) : (
              respondingTo === review.id ? (
                <View style={styles.respondForm}>
                  <TextInput
                    style={styles.respondInput}
                    value={responseText}
                    onChangeText={setResponseText}
                    placeholder="Write your response..."
                    multiline
                  />
                  <View style={styles.respondButtons}>
                    <TouchableOpacity onPress={() => setRespondingTo(null)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={() => handleRespond(review.id)}
                    >
                      <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.respondButton}
                  onPress={() => setRespondingTo(review.id)}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
                  <Text style={styles.respondButtonText}>Respond</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  summaryCard: { flexDirection: 'row', backgroundColor: Colors.background, margin: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg },
  ratingOverview: { alignItems: 'center', marginRight: Spacing.lg },
  averageRating: { fontSize: 48, fontWeight: 'bold', color: Colors.text },
  starsRow: { flexDirection: 'row', gap: 2 },
  totalReviews: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  ratingBars: { flex: 1 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ratingLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, width: 16 },
  ratingBarBg: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, marginHorizontal: Spacing.sm },
  ratingBarFill: { height: '100%', backgroundColor: '#FFB800', borderRadius: 4 },
  ratingCount: { fontSize: FontSizes.sm, color: Colors.textSecondary, width: 24, textAlign: 'right' },
  quickLinks: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  quickLink: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  quickLinkText: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '500' },
  filterRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.background },
  filterTabActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  filterTextActive: { color: Colors.textOnPrimary },
  reviewsList: { flex: 1, padding: Spacing.md },
  reviewCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  sourceIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  reviewMeta: { flex: 1, marginLeft: Spacing.sm },
  reviewAuthor: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  reviewDate: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  reviewText: { fontSize: FontSizes.md, color: Colors.text, lineHeight: 22 },
  responseCard: { backgroundColor: Colors.primary + '10', padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  responseLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary },
  responseText: { fontSize: FontSizes.sm, color: Colors.text },
  respondButton: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: Spacing.xs },
  respondButtonText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '500' },
  respondForm: { marginTop: Spacing.md },
  respondInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, minHeight: 80, textAlignVertical: 'top' },
  respondButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.md },
  cancelText: { fontSize: FontSizes.md, color: Colors.textSecondary },
  sendButton: { backgroundColor: Colors.primary, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md },
  sendButtonText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textOnPrimary },
});
