import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CORRECTIVE_ACTIONS } from '../../types/checklists';
import { takePhoto } from '../../lib/photos';
import { C } from '../../lib/checklists/theme';

interface Props {
  visible: boolean;
  title: string;
  detail?: string;
  onClose: () => void;
  onSave: (action: string, note: string, photoUri: string | null) => void;
}

export default function CorrectiveActionModal({ visible, title, detail, onClose, onSave }: Props) {
  const [action, setAction] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => { if (visible) { setAction(null); setNote(''); setPhoto(null); } }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView>
            <View style={styles.head}>
              <Ionicons name="warning" size={26} color={C.bad} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.title}>Corrective action required</Text>
                <Text style={styles.sub}>{title}</Text>
                {!!detail && <Text style={styles.detail}>{detail}</Text>}
              </View>
            </View>

            <Text style={styles.label}>What did you do?</Text>
            <View style={styles.choices}>
              {CORRECTIVE_ACTIONS.map(a => (
                <TouchableOpacity key={a} onPress={() => setAction(a)} style={[styles.choice, action === a && styles.choiceOn]}>
                  <Text style={[styles.choiceText, action === a && styles.choiceTextOn]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Example: rechecked at 2:15, now 38°F"
              multiline
            />

            <Text style={styles.label}>Photo (optional)</Text>
            {photo ? (
              <TouchableOpacity onPress={() => setPhoto(null)}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <Text style={styles.remove}>Tap to remove</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoBtn} onPress={async () => { const p = await takePhoto(); if (p) setPhoto(p.uri); }}>
                <Ionicons name="camera-outline" size={22} color={C.text} />
                <Text style={styles.photoBtnText}>Take photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: C.bg }]} onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!action}
              style={[styles.btn, { backgroundColor: C.bad }, !action && { opacity: 0.4 }]}
              onPress={() => action && onSave(action, note.trim(), photo)}
            >
              <Text style={styles.save}>Save action</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '92%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 19, fontWeight: '800', color: C.bad },
  sub: { fontSize: 15, color: C.text, marginTop: 2, fontWeight: '600' },
  detail: { fontSize: 14, color: C.sub, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '700', color: C.sub, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: C.border },
  choiceOn: { borderColor: C.bad, backgroundColor: C.badBg },
  choiceText: { fontSize: 15, color: C.text, fontWeight: '600' },
  choiceTextOn: { color: C.bad },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, minHeight: 60, fontSize: 16 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: C.bg },
  photoBtnText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: C.text },
  photo: { width: 160, height: 120, borderRadius: 12 },
  remove: { fontSize: 12, color: C.sub, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancel: { fontSize: 17, fontWeight: '600', color: C.text },
  save: { fontSize: 17, fontWeight: '800', color: '#fff' },
});
