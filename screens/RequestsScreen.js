import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { formatDateHebrew } from '../lib/dates';
import DecorativeBlobs from '../components/DecorativeBlobs';
import EmptyState from '../components/EmptyState';
import AddRequestModal from '../components/AddRequestModal';

const PURPLE = '#6B3FA0';
const BORDER = '#E0E0E0';

export default function RequestsScreen() {
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('id, date, note, client_id, clients(id, name)')
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    setRequests(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const removeRequest = async (id) => {
    await supabase.from('requests').delete().eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const navigateToClient = (clientId) => {
    navigation.navigate('Clients', { screen: 'ClientDetail', params: { clientId } });
  };

  const byDate = {};
  requests.forEach(r => { (byDate[r.date] ??= []).push(r); });
  const dates = Object.keys(byDate);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DecorativeBlobs />

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
        <Ionicons name="add-circle-outline" size={20} color={PURPLE} />
        <Text style={styles.addBtnText}>בקשה חדשה</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={PURPLE} style={{ marginTop: 32 }} />
      ) : dates.length === 0 ? (
        <EmptyState icon="chatbox-ellipses-outline" text="אין בקשות פתוחות" />
      ) : (
        <FlatList
          data={dates}
          keyExtractor={d => d}
          contentContainerStyle={{ padding: 12, paddingTop: 0 }}
          renderItem={({ item: date }) => (
            <View style={styles.daySection}>
              <Text style={styles.dayHeader}>{formatDateHebrew(date)}</Text>
              {byDate[date].map(r => (
                <View key={r.id} style={styles.row}>
                  <TouchableOpacity onPress={() => removeRequest(r.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-outline" size={18} color="#CCC" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.info} onPress={() => navigateToClient(r.client_id)}>
                    <Text style={styles.clientName}>{r.clients?.name ?? ''}</Text>
                    {r.note ? <Text style={styles.note}>{r.note}</Text> : null}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        />
      )}

      <AddRequestModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => fetchRequests()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, margin: 12, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: PURPLE,
    borderStyle: 'dashed', backgroundColor: '#FFF',
  },
  addBtnText: { fontSize: 16, color: PURPLE, fontWeight: '600' },
  daySection: { marginBottom: 16 },
  dayHeader: { fontSize: 14, fontWeight: '700', color: '#555', textAlign: 'right', marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginBottom: 6,
  },
  info: { flex: 1 },
  clientName: { fontSize: 15, color: '#1A1A1A', fontWeight: '600', textAlign: 'right' },
  note: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 2 },
});
