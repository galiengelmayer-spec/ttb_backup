import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { todayString } from '../lib/dates';
import ClientPicker from './ClientPicker';
import DateInput from './DateInput';

const PURPLE = '#6B3FA0';
const RED = '#C62828';
const BORDER = '#E0E0E0';

// Shared between נוכחות (date fixed to whatever's on screen) and the בקשות
// list (date freely chosen) — a request is a client + date + free text,
// written in Shirly's own words rather than forced into structured fields
// (the old time-slot picker didn't match how she actually jots these down).
export default function AddRequestModal({ visible, onClose, fixedDate, onAdded }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [date, setDate] = useState(fixedDate || todayString());
  const [content, setContent] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setSelectedClient(null);
      setDate(fixedDate || todayString());
      setContent('');
      setListening(false);
    }
  }, [visible, fixedDate]);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  // Web Speech API only — not supported on Safari/iOS. Where it's missing
  // this just no-ops; the field is plain text either way, so the device
  // keyboard's own dictation button still works regardless.
  const dictationSupported = Platform.OS === 'web'
    && typeof window !== 'undefined'
    && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleDictation = () => {
    if (!dictationSupported) return;
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setContent(prev => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const save = async () => {
    if (!selectedClient || !date || !content.trim()) return;
    const { data } = await supabase
      .from('requests')
      .insert({ client_id: selectedClient.id, date, time_slot: '', note: content.trim() })
      .select('*, clients(id, name)')
      .single();
    if (data) onAdded(data);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
            <Text style={styles.title}>בקשה חדשה</Text>
          </View>

          <Text style={styles.label}>לקוח/ה</Text>
          <ClientPicker selectedClient={selectedClient} onSelect={setSelectedClient} />

          {!fixedDate && (
            <>
              <Text style={styles.label}>תאריך</Text>
              <DateInput value={date} onChange={setDate} />
            </>
          )}

          <Text style={styles.label}>פרטי הבקשה</Text>
          <View style={styles.contentRow}>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="לדוגמה: 19:00 - מבקשת להחליף יום"
              placeholderTextColor="#BBB"
              textAlign="right"
              multiline
            />
            {dictationSupported && (
              <TouchableOpacity
                onPress={toggleDictation}
                style={[styles.micBtn, listening && styles.micBtnActive]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="mic" size={20} color={listening ? '#FFF' : PURPLE} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, (!selectedClient || !content.trim()) && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!selectedClient || !content.trim()}
          >
            <Text style={styles.saveBtnText}>הוספת בקשה</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  label: { fontSize: 13, color: '#888', fontWeight: '600', textAlign: 'right', marginBottom: 6, marginTop: 14 },
  contentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  contentInput: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: BORDER, minHeight: 70, textAlignVertical: 'top',
  },
  micBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3EEF9',
    borderWidth: 1, borderColor: '#D4C5EF', alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: RED, borderColor: RED },
  saveBtn: { backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { backgroundColor: '#DDD' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
