import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { computeCycleStats, pillStateFromStats, pillSortRank } from '../lib/cycles';
import { fetchAllRows } from '../lib/fetchAll';
import LessonCountBadge from '../components/LessonCountBadge';
import DecorativeBlobs from '../components/DecorativeBlobs';
import EmptyState from '../components/EmptyState';

const PURPLE = '#6B3FA0';
const BORDER = '#E0E0E0';

export default function ClientsScreen() {
  const navigation = useNavigation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortByDebt, setSortByDebt] = useState(false);
  const searchTimer = useRef(null);

  const fetchClients = useCallback(async (query = '') => {
    setLoading(true);
    let q = supabase
      .from('clients')
      .select('id, name, phone')
      .eq('active', true)
      .order('name');
    if (query.trim()) q = q.ilike('name', `%${query.trim()}%`);
    const { data: list } = await q;

    if (!list || list.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }

    const ids = list.map(c => c.id);
    const [atts, purchases] = await Promise.all([
      fetchAllRows(() =>
        supabase
          .from('attendances')
          .select('client_id, date')
          .in('client_id', ids)
          .order('date', { ascending: true })
      ),
      fetchAllRows(() =>
        supabase
          .from('purchases')
          .select('id, client_id, lessons_count, paid, purchased_at, created_at')
          .in('client_id', ids)
      ),
    ]);

    const attsByClient = {};
    atts.forEach(a => { (attsByClient[a.client_id] ??= []).push(a); });
    const purchasesByClient = {};
    purchases.forEach(p => { (purchasesByClient[p.client_id] ??= []).push(p); });

    setClients(list.map(c => {
      const stats = computeCycleStats(attsByClient[c.id] ?? [], purchasesByClient[c.id] ?? []);
      return { ...c, pill: pillStateFromStats(stats) };
    }));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchClients(search); }, [fetchClients, search]));

  const onSearchChange = (text) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchClients(text), 250);
  };

  // Sorted in-memory — every client's pill state is already loaded, no
  // need to round-trip to the server just to reorder what's on screen.
  // Overdraft clients first (highest overdraft first), then everyone
  // mid-ticket (highest usage first), then "needs a new ticket", then
  // everyone with nothing to flag.
  const displayedClients = sortByDebt
    ? [...clients].sort((a, b) => pillSortRank(b.pill) - pillSortRank(a.pill))
    : clients;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <DecorativeBlobs />
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="חיפוש לקוח..."
          placeholderTextColor="#AAA"
          value={search}
          onChangeText={onSearchChange}
          textAlign="right"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); fetchClients(''); }}>
            <Ionicons name="close-circle" size={20} color="#CCC" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('ClientDetail', { clientId: null })}
      >
        <Ionicons name="person-add-outline" size={18} color={PURPLE} />
        <Text style={styles.addButtonText}>לקוח חדש</Text>
      </TouchableOpacity>

      {clients.length > 0 && (
        <TouchableOpacity
          style={styles.sortToggle}
          onPress={() => setSortByDebt(v => !v)}
        >
          <Ionicons name="swap-vertical-outline" size={15} color={PURPLE} />
          <Text style={styles.sortToggleText}>
            {sortByDebt ? 'מיון: לפי חוב' : 'מיון: לפי שם'}
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator color={PURPLE} style={{ marginTop: 32 }} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={search ? 'search-outline' : 'people-outline'}
          text={search ? 'לא נמצאו תוצאות' : 'אין לקוחות עדיין'}
        />
      ) : (
        <FlatList
          data={displayedClients}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.clientItem}
              onPress={() => navigation.navigate('ClientDetail', { clientId: item.id })}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color="#CCC" />
              {/* Fixed-width slot, clustered right next to the chevron, so
                  the pill's edge and the name's start stay put whether or
                  not this client has anything to show. */}
              <View style={styles.debtSlot}>
                <LessonCountBadge {...item.pill} />
              </View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.name}</Text>
                {item.phone ? <Text style={styles.clientPhone}>{item.phone}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    height: 48,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1A1A1A', textAlign: 'right' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderStyle: 'dashed',
  },
  addButtonText: { color: PURPLE, fontSize: 15, fontWeight: '600' },
  sortToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end',
    marginHorizontal: 16, marginBottom: 8,
  },
  sortToggleText: { color: PURPLE, fontSize: 13, fontWeight: '600' },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 8,
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 17, color: '#1A1A1A', fontWeight: '500', textAlign: 'right' },
  clientPhone: { fontSize: 13, color: '#888', marginTop: 2, textAlign: 'right' },
  debtSlot: { minWidth: 32, alignItems: 'flex-start' },
});
