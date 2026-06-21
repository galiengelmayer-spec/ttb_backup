import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  fetchAbsentThisWeek, fetchWeeklyAttendance, fetchUnpaidClients,
  fetchReminderClients, fetchUnpaidCounts, markReminderSent,
} from '../lib/dashboardData';
import { formatDateHebrew, formatDateRangeShort } from '../lib/dates';
import { toWhatsAppLink, DEFAULT_REMINDER_TEMPLATE } from '../lib/whatsapp';
import { alertAsync } from '../lib/confirm';
import { supabase } from '../lib/supabase';
import DebtBadge from '../components/DebtBadge';
import DecorativeBlobs from '../components/DecorativeBlobs';
import EmptyState from '../components/EmptyState';

const PURPLE = '#6B3FA0';
const GREEN = '#2E7D32';
const BORDER = '#E0E0E0';

export default function DashboardDrillDownScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { type } = route.params ?? {};

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [unpaidCounts, setUnpaidCounts] = useState({});
  const [sentIds, setSentIds] = useState(new Set());
  const [reminderTemplate, setReminderTemplate] = useState(DEFAULT_REMINDER_TEMPLATE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (type === 'absent' || type === 'weekly') {
      setUnpaidCounts(await fetchUnpaidCounts());
    }
    if (type === 'absent') setItems(await fetchAbsentThisWeek());
    else if (type === 'weekly') setItems(await fetchWeeklyAttendance());
    else if (type === 'unpaid') setItems(await fetchUnpaidClients());
    else if (type === 'reminders') {
      setItems(await fetchReminderClients());
      const { data } = await supabase.from('settings').select('value').eq('key', 'reminder_message_template').maybeSingle();
      setReminderTemplate(data?.value || DEFAULT_REMINDER_TEMPLATE);
    }
    setLoading(false);
  }, [type]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const navigateToClient = (clientId) => {
    if (!clientId) return;
    navigation.navigate('Clients', { screen: 'ClientDetail', params: { clientId } });
  };

  const sendReminder = async (clientWithStats) => {
    const link = toWhatsAppLink(clientWithStats.phone, reminderTemplate);
    if (!link) {
      await alertAsync('אין מספר טלפון', 'הוסיפי מספר טלפון ללקוח/ה דרך הכרטיס שלו/ה לפני השליחה.');
      return;
    }
    await Linking.openURL(link);
    // The always_remind test contact never persists "sent" — every refresh
    // resumes at "שלח תזכורת" so the WhatsApp flow can be tested repeatedly.
    if (!clientWithStats.always_remind && clientWithStats.stats.last) {
      await markReminderSent(clientWithStats.stats.last.id);
    }
    setSentIds(prev => new Set(prev).add(clientWithStats.id));
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={PURPLE} size="large" /></View>;
  }

  // ---- Absent this week ----
  if (type === 'absent') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <DecorativeBlobs />
        {items.length === 0 ? (
          <EmptyState icon="airplane-outline" text="אף אחד לא מסומן כנעדר השבוע" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => navigateToClient(item.clients?.id)}>
                <Ionicons name="chevron-back" size={16} color="#CCC" />
                <View style={styles.debtSlot}>
                  <DebtBadge {...(unpaidCounts[item.clients?.id] ?? {})} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.clients?.name ?? ''}</Text>
                  <Text style={styles.rowSub}>{item.reason || 'היעדרות'} · {formatDateRangeShort(item.from_date, item.to_date)}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ---- Weekly attendance, grouped by day ----
  if (type === 'weekly') {
    const byDate = {};
    items.forEach(a => { (byDate[a.date] ??= []).push(a); });
    const dates = Object.keys(byDate).sort();

    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <DecorativeBlobs />
        {dates.length === 0 ? (
          <EmptyState icon="stats-chart-outline" text="אין נוכחות השבוע" />
        ) : (
          <FlatList
            data={dates}
            keyExtractor={d => d}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item: date }) => (
              <View style={styles.daySection}>
                <Text style={styles.dayHeader}>{formatDateHebrew(date)} ({byDate[date].length})</Text>
                {byDate[date].map(a => (
                  <TouchableOpacity key={a.id} style={styles.dayRow} onPress={() => navigateToClient(a.clients?.id)}>
                    <Ionicons name="chevron-back" size={14} color="#CCC" />
                    <View style={styles.debtSlot}>
                      <DebtBadge {...(unpaidCounts[a.clients?.id] ?? {})} />
                    </View>
                    <Text style={styles.dayRowName}>{a.clients?.name ?? ''}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ---- Unpaid (total debt, any month) ----
  if (type === 'unpaid') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <DecorativeBlobs />
        {items.length === 0 ? (
          <EmptyState icon="cash-outline" text="אין חובות פתוחים 🎉" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => navigateToClient(item.id)}>
                <Ionicons name="chevron-back" size={16} color="#CCC" />
                <View style={styles.debtSlot}>
                  <DebtBadge unpaidCount={item.stats.unpaidCount} overdraftCount={item.stats.overdraftCount} />
                </View>
                <Text style={styles.rowName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ---- Reminders to send ----
  if (type === 'reminders') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <DecorativeBlobs />
        {items.length === 0 ? (
          <EmptyState icon="notifications-outline" text="אין תזכורות לשלוח" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => {
              const sent = sentIds.has(item.id) || (!item.always_remind && !!item.stats.last?.reminder_sent_at);
              return (
                <View style={styles.row}>
                  <TouchableOpacity style={styles.rowInfo} onPress={() => navigateToClient(item.id)}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowSub}>
                      {item.stats.last
                        ? (item.stats.remaining > 0
                          ? `נותר/ה לה שיעור אחד בכרטיסייה`
                          : 'סיימה את הכרטיסייה')
                        : 'איש קשר לבדיקה'}
                    </Text>
                  </TouchableOpacity>
                  <DebtBadge unpaidCount={item.stats.unpaidCount} overdraftCount={item.stats.overdraftCount} />
                  {sent ? (
                    <View style={styles.sentBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                      <Text style={styles.sentText}>נשלחה תזכורת</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.sendBtn} onPress={() => sendReminder(item)}>
                      <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                      <Text style={styles.sendBtnText}>שלח תזכורת</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginBottom: 8,
  },
  rowInfo: { flex: 1 },
  rowName: { flex: 1, fontSize: 16, color: '#1A1A1A', fontWeight: '500', textAlign: 'right' },
  rowSub: { fontSize: 12, color: '#888', marginTop: 2, textAlign: 'right' },
  debtSlot: { minWidth: 28, alignItems: 'flex-start' },
  daySection: { marginBottom: 16 },
  dayHeader: { fontSize: 14, fontWeight: '700', color: '#555', textAlign: 'right', marginBottom: 6 },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER, marginBottom: 4,
  },
  dayRowName: { fontSize: 15, color: '#1A1A1A', textAlign: 'right', flex: 1 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#25D366', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16,
  },
  sendBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  sentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sentText: { fontSize: 12, color: GREEN, fontWeight: '600' },
});
