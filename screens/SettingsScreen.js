import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, TextInput, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatDateRangeShort } from '../lib/dates';
import { toWhatsAppLink, DEFAULT_CLOSURE_TEMPLATE, DEFAULT_REMINDER_TEMPLATE } from '../lib/whatsapp';
import DateRangePicker from '../components/DateRangePicker';

const PURPLE = '#6B3FA0';
const BORDER = '#E0E0E0';

export default function SettingsScreen() {
  const [offDays, setOffDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [template, setTemplate] = useState(DEFAULT_CLOSURE_TEMPLATE);
  const [reminderTemplate, setReminderTemplate] = useState(DEFAULT_REMINDER_TEMPLATE);
  const [broadcastRange, setBroadcastRange] = useState(null);
  const [broadcastClients, setBroadcastClients] = useState([]);
  const [sentTo, setSentTo] = useState(new Set());

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['off_days', 'closure_message_template', 'reminder_message_template']);
    (data ?? []).forEach(row => {
      if (row.key === 'off_days' && row.value) setOffDays(row.value);
      if (row.key === 'closure_message_template' && row.value) setTemplate(row.value);
      if (row.key === 'reminder_message_template' && row.value) setReminderTemplate(row.value);
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveOffDays = async (newList) => {
    setSaving(true);
    await supabase.from('settings').upsert({ key: 'off_days', value: newList });
    setSaving(false);
  };

  const addRange = async (entry) => {
    const newList = [...offDays, entry];
    setOffDays(newList);
    await saveOffDays(newList);
  };

  const removeRange = async (id) => {
    const newList = offDays.filter(r => r.id !== id);
    setOffDays(newList);
    if (broadcastRange?.id === id) setBroadcastRange(null);
    await saveOffDays(newList);
  };

  const saveTemplate = async () => {
    await supabase.from('settings').upsert({ key: 'closure_message_template', value: template });
  };

  const saveReminderTemplate = async () => {
    await supabase.from('settings').upsert({ key: 'reminder_message_template', value: reminderTemplate });
  };

  const openBroadcast = async (range) => {
    setBroadcastRange(range);
    setSentTo(new Set());
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('active', true)
      .order('name');
    setBroadcastClients(data ?? []);
  };

  const mergedMessage = broadcastRange
    ? template.replace('{תאריכים}', formatDateRangeShort(broadcastRange.from, broadcastRange.to))
    : '';

  const sendToClient = async (client) => {
    const link = toWhatsAppLink(client.phone, mergedMessage);
    if (link) await Linking.openURL(link);
    setSentTo(prev => new Set(prev).add(client.id));
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={PURPLE} size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Off-days */}
        <View style={styles.section}>
          <DateRangePicker
            title="ימי סגירה"
            emptyText="לא הוגדרו ימי סגירה עדיין"
            ranges={offDays}
            onAdd={addRange}
            onRemove={removeRange}
            onSendRange={openBroadcast}
            addButtonLabel="הוסף טווח סגירה"
            saving={saving}
          />
        </View>

        {/* Reminder message template */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הודעת תזכורת (סיום כרטיסייה)</Text>
          <Text style={styles.sectionSubtitle}>
            ההודעה שנשלחת בוואטסאפ כשלקוח/ה מסיים/ת מחזור של 10 שיעורים
          </Text>
          <TextInput
            style={styles.templateInput}
            value={reminderTemplate}
            onChangeText={setReminderTemplate}
            onBlur={saveReminderTemplate}
            multiline
            textAlign="right"
            textAlignVertical="top"
          />
        </View>

        {/* Closure message template */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הודעת סגירה ללקוחות</Text>
          <Text style={styles.sectionSubtitle}>
            השתמשי ב-{'{תאריכים}'} כדי שהתאריכים יושלמו אוטומטית
          </Text>
          <TextInput
            style={styles.templateInput}
            value={template}
            onChangeText={setTemplate}
            onBlur={saveTemplate}
            multiline
            textAlign="right"
            textAlignVertical="top"
          />
          <Text style={styles.hint}>
            לשליחה: לחצי על סמל השליחה ✈️ ליד אחד מימי הסגירה למעלה
          </Text>
        </View>

        {/* Broadcast panel */}
        {broadcastRange && (
          <View style={styles.section}>
            <View style={styles.broadcastHeader}>
              <TouchableOpacity onPress={() => setBroadcastRange(null)}>
                <Ionicons name="close-circle" size={20} color="#888" />
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>שליחה: {broadcastRange.label}</Text>
            </View>
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>{mergedMessage}</Text>
            </View>
            {broadcastClients.map(c => {
              const sent = sentTo.has(c.id);
              return (
                <View key={c.id} style={styles.broadcastRow}>
                  <Text style={styles.broadcastName}>{c.name}</Text>
                  {sent ? (
                    <View style={styles.sentBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                      <Text style={styles.sentText}>נשלח</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.sendBtn} onPress={() => sendToClient(c)}>
                      <Ionicons name="logo-whatsapp" size={14} color="#FFF" />
                      <Text style={styles.sendBtnText}>שלח</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.version}>גרסה 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: {
    backgroundColor: '#FFF', margin: 12, marginBottom: 0,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', textAlign: 'right', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#AAA', textAlign: 'right', marginBottom: 12 },

  templateInput: {
    backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: BORDER,
    minHeight: 80, marginBottom: 8,
  },
  hint: { fontSize: 11, color: '#AAA', textAlign: 'right' },

  broadcastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  previewBox: {
    backgroundColor: '#F3EEF9', borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#D4C5EF',
  },
  previewText: { fontSize: 13, color: '#3A1A6A', textAlign: 'right' },
  broadcastRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  broadcastName: { fontSize: 15, color: '#1A1A1A', textAlign: 'right' },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#25D366', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16,
  },
  sendBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  sentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sentText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  version: { textAlign: 'center', color: '#CCC', fontSize: 12, marginTop: 20 },
});
