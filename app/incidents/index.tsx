import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Incident {
  id: string;
  type: 'accident' | 'injury' | 'customer_complaint' | 'safety_hazard' | 'property_damage' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location_area: string;
  involved_parties?: string;
  witnesses?: string;
  actions_taken?: string;
  photos?: string[];
  status: 'open' | 'investigating' | 'resolved';
  reported_by: string;
  reported_at: string;
}

const INCIDENT_TYPES = [
  { id: 'accident', label: 'Accident', icon: 'warning', color: Colors.error },
  { id: 'injury', label: 'Injury', icon: 'medkit', color: '#dc2626' },
  { id: 'customer_complaint', label: 'Customer Complaint', icon: 'chatbubble-ellipses', color: Colors.warning },
  { id: 'safety_hazard', label: 'Safety Hazard', icon: 'alert-circle', color: '#f97316' },
  { id: 'property_damage', label: 'Property Damage', icon: 'hammer', color: '#8b5cf6' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: Colors.textSecondary },
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', color: Colors.info },
  { id: 'medium', label: 'Medium', color: Colors.warning },
  { id: 'high', label: 'High', color: '#f97316' },
  { id: 'critical', label: 'Critical', color: Colors.error },
];

export default function IncidentReportScreen() {
  const { user, currentLocation } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Form state
  const [type, setType] = useState<Incident['type']>('accident');
  const [severity, setSeverity] = useState<Incident['severity']>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationArea, setLocationArea] = useState('');
  const [involvedParties, setInvolvedParties] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .eq('location_id', currentLocation?.id)
      .order('reported_at', { ascending: false });

    if (data) setIncidents(data);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !locationArea) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    try {
      const { error } = await supabase.from('incidents').insert({
        location_id: currentLocation?.id,
        type,
        severity,
        title,
        description,
        location_area: locationArea,
        involved_parties: involvedParties || null,
        witnesses: witnesses || null,
        actions_taken: actionsTaken || null,
        photos: photos.length > 0 ? photos : null,
        status: 'open',
        reported_by: user?.id,
        reported_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert('Report Submitted', 'Your incident report has been filed. A manager will review it shortly.');
      resetForm();
      setShowAddModal(false);
      fetchIncidents();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit incident report.');
    }
  };

  const resetForm = () => {
    setType('accident');
    setSeverity('medium');
    setTitle('');
    setDescription('');
    setLocationArea('');
    setInvolvedParties('');
    setWitnesses('');
    setActionsTaken('');
    setPhotos([]);
  };

  const filteredIncidents = incidents.filter((i) => {
    if (filter === 'all') return true;
    if (filter === 'open') return i.status !== 'resolved';
    return i.status === 'resolved';
  });

  const getTypeConfig = (typeId: string) => INCIDENT_TYPES.find((t) => t.id === typeId) || INCIDENT_TYPES[5];
  const getSeverityConfig = (severityId: string) => SEVERITY_LEVELS.find((s) => s.id === severityId) || SEVERITY_LEVELS[1];

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'open', 'resolved'] as const).map((f) => (
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

      <ScrollView style={styles.list}>
        {filteredIncidents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Incidents</Text>
            <Text style={styles.emptyText}>No incident reports found</Text>
          </View>
        ) : (
          filteredIncidents.map((incident) => {
            const typeConfig = getTypeConfig(incident.type);
            const severityConfig = getSeverityConfig(incident.severity);
            return (
              <TouchableOpacity key={incident.id} style={styles.incidentCard}>
                <View style={styles.incidentHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
                    <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
                  </View>
                  <View style={styles.incidentInfo}>
                    <Text style={styles.incidentTitle}>{incident.title}</Text>
                    <Text style={styles.incidentMeta}>
                      {format(new Date(incident.reported_at), 'MMM d, yyyy h:mm a')}
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: severityConfig.color }]}>
                    <Text style={styles.severityText}>{severityConfig.label}</Text>
                  </View>
                </View>
                <Text style={styles.incidentDescription} numberOfLines={2}>
                  {incident.description}
                </Text>
                <View style={styles.incidentFooter}>
                  <View style={[styles.statusBadge, {
                    backgroundColor: incident.status === 'resolved' ? Colors.success + '20' :
                      incident.status === 'investigating' ? Colors.warning + '20' : Colors.info + '20'
                  }]}>
                    <Text style={[styles.statusText, {
                      color: incident.status === 'resolved' ? Colors.success :
                        incident.status === 'investigating' ? Colors.warning : Colors.info
                    }]}>
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.locationText}>{incident.location_area}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Report Button */}
      <TouchableOpacity style={styles.reportButton} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color={Colors.textOnPrimary} />
        <Text style={styles.reportButtonText}>Report Incident</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Incident</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Incident Type *</Text>
              <View style={styles.typeGrid}>
                {INCIDENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeButton, type === t.id && { backgroundColor: t.color }]}
                    onPress={() => setType(t.id as Incident['type'])}
                  >
                    <Ionicons name={t.icon as any} size={20} color={type === t.id ? Colors.textOnPrimary : t.color} />
                    <Text style={[styles.typeButtonText, type === t.id && styles.typeButtonTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Severity *</Text>
              <View style={styles.severityRow}>
                {SEVERITY_LEVELS.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.severityButton, severity === s.id && { backgroundColor: s.color }]}
                    onPress={() => setSeverity(s.id as Incident['severity'])}
                  >
                    <Text style={[styles.severityButtonText, severity === s.id && styles.severityButtonTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Brief description of incident"
              />

              <Text style={styles.inputLabel}>Location/Area *</Text>
              <TextInput
                style={styles.input}
                value={locationArea}
                onChangeText={setLocationArea}
                placeholder="e.g., Kitchen, Front counter, Parking lot"
              />

              <Text style={styles.inputLabel}>Detailed Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what happened in detail..."
                multiline
              />

              <Text style={styles.inputLabel}>Involved Parties</Text>
              <TextInput
                style={styles.input}
                value={involvedParties}
                onChangeText={setInvolvedParties}
                placeholder="Names of people involved"
              />

              <Text style={styles.inputLabel}>Witnesses</Text>
              <TextInput
                style={styles.input}
                value={witnesses}
                onChangeText={setWitnesses}
                placeholder="Names of witnesses"
              />

              <Text style={styles.inputLabel}>Actions Taken</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={actionsTaken}
                onChangeText={setActionsTaken}
                placeholder="What immediate actions were taken?"
                multiline
              />

              <Text style={styles.inputLabel}>Photos</Text>
              <View style={styles.photoSection}>
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                    <Ionicons name="camera" size={24} color={Colors.primary} />
                    <Text style={styles.photoButtonText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                    <Ionicons name="images" size={24} color={Colors.primary} />
                    <Text style={styles.photoButtonText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
                {photos.length > 0 && (
                  <ScrollView horizontal style={styles.photoPreview}>
                    {photos.map((uri, index) => (
                      <View key={index} style={styles.photoContainer}>
                        <Image source={{ uri }} style={styles.photo} />
                        <TouchableOpacity
                          style={styles.removePhoto}
                          onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Ionicons name="close-circle" size={24} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  filterRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.background },
  filterTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
  filterTabActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  filterTextActive: { color: Colors.textOnPrimary },
  list: { flex: 1, padding: Spacing.md },
  emptyState: { alignItems: 'center', padding: Spacing.xxl },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.md, color: Colors.textSecondary },
  incidentCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  incidentInfo: { flex: 1, marginLeft: Spacing.md },
  incidentTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  incidentMeta: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  severityBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  severityText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textOnPrimary },
  incidentDescription: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  incidentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  locationText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  reportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.error, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  reportButtonText: { color: Colors.textOnPrimary, fontSize: FontSizes.lg, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeButton: { width: '31%', padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, alignItems: 'center' },
  typeButtonText: { fontSize: FontSizes.xs, color: Colors.text, marginTop: 4, textAlign: 'center' },
  typeButtonTextActive: { color: Colors.textOnPrimary },
  severityRow: { flexDirection: 'row', gap: Spacing.sm },
  severityButton: { flex: 1, padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, alignItems: 'center' },
  severityButtonText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  severityButtonTextActive: { color: Colors.textOnPrimary },
  photoSection: { marginTop: Spacing.sm },
  photoButtons: { flexDirection: 'row', gap: Spacing.md },
  photoButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, gap: Spacing.sm },
  photoButtonText: { fontSize: FontSizes.md, color: Colors.primary },
  photoPreview: { marginTop: Spacing.md },
  photoContainer: { marginRight: Spacing.sm, position: 'relative' },
  photo: { width: 80, height: 80, borderRadius: BorderRadius.md },
  removePhoto: { position: 'absolute', top: -8, right: -8 },
  submitButton: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  submitButtonText: { color: Colors.textOnPrimary, fontSize: FontSizes.lg, fontWeight: '600' },
});
