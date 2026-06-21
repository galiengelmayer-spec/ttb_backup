import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  fetchAbsentThisWeek, fetchWeeklyAttendance, fetchUnpaidClients, fetchReminderClients,
} from '../lib/dashboardData';
import DecorativeBlobs from '../components/DecorativeBlobs';

const PURPLE = '#6B3FA0';
const RED = '#C62828';
const BORDER = '#E0E0E0';

const CARDS = [
  { type: 'reminders', icon: 'notifications-outline', label: 'התראה לפני סיום כרטיסיה', highlight: true },
  { type: 'unpaid', icon: 'cash-outline', label: 'טרם שלמו', highlight: true },
  { type: 'weekly', icon: 'stats-chart-outline', label: 'נוכחות השבוע', highlight: false },
  { type: 'absent', icon: 'airplane-outline', label: 'נעדרים השבוע', highlight: false },
];

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ absent: 0, weekly: 0, unpaid: 0, reminders: 0 });

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    const [absent, weekly, unpaid, reminders] = await Promise.all([
      fetchAbsentThisWeek(), fetchWeeklyAttendance(), fetchUnpaidClients(), fetchReminderClients(),
    ]);
    setCounts({ absent: absent.length, weekly: weekly.length, unpaid: unpaid.length, reminders: reminders.length });
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchCounts(); }, [fetchCounts]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={PURPLE} size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DecorativeBlobs />
      <View style={styles.grid}>
        {CARDS.map(card => {
          const count = counts[card.type];
          const lit = card.highlight && count > 0;
          return (
            <TouchableOpacity
              key={card.type}
              style={[styles.card, lit && styles.cardLit]}
              onPress={() => navigation.navigate('DashboardDrillDown', { type: card.type })}
              activeOpacity={0.8}
            >
              <Ionicons name={card.icon} size={22} color={lit ? RED : PURPLE} />
              <Text style={[styles.cardNumber, lit && styles.cardNumberLit]}>{count}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12,
  },
  card: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 18,
    paddingVertical: 22, paddingHorizontal: 12, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: BORDER,
    boxShadow: '0 3px 10px rgba(107,63,160,0.08)',
  },
  cardLit: {
    backgroundColor: '#FFEBEE', borderColor: '#FFCDD2',
    boxShadow: '0 3px 10px rgba(198,40,40,0.12)',
  },
  cardNumber: { fontSize: 30, fontWeight: '800', color: '#1A1A1A' },
  cardNumberLit: { color: RED },
  cardLabel: { fontSize: 13, color: '#555', fontWeight: '600', textAlign: 'center' },
});
