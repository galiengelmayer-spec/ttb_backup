import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Keyboard, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { todayString, addDays, formatDateHebrew } from '../lib/dates';
import { fetchUnpaidCounts } from '../lib/dashboardData';
import DebtBadge from '../components/DebtBadge';
import DecorativeBlobs from '../components/DecorativeBlobs';
import EmptyState from '../components/EmptyState';
import HeaderMenu from '../components/HeaderMenu';
import AddRequestModal from '../components/AddRequestModal';

const PURPLE = '#6B3FA0';
const GREEN = '#2E7D32';
const BORDER = '#E0E0E0';

export default function AttendanceScreen() {
  const navigation = useNavigation();
  const [date, setDate] = useState(todayString());
  const [attended, setAttended] = useState([]);
  const [loadingAttended, setLoadingAttended] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [allClients, setAllClients] = useState([]);
  const [unpaidCounts, setUnpaidCounts] = useState({});
  const searchTimer = useRef(null);
  const inputRef = useRef(null);

  const fetchAllClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('active', true)
      .order('name');
    setAllClients(data ?? []);
    setUnpaidCounts(await fetchUnpaidCounts());
  }, []);

  const fetchAttended = useCallback(async () => {
    setLoadingAttended(true);
    const { data } = await supabase
      .from('attendances')
      .select('id, client_id, clients(id, name)')
      .eq('date', date)
      .order('created_at', { ascending: false });
    setAttended(data ?? []);
    setLoadingAttended(false);
  }, [date]);

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('requests')
      .select('id, note, client_id, clients(id, name)')
      .eq('date', date)
      .order('created_at', { ascending: true });
    setRequests(data ?? []);
  }, [date]);

  // This is a tab screen, not a stack screen — it stays mounted when you
  // switch tabs, so a plain useEffect-on-mount would never see debt counts
  // change after editing payments on a client card and coming back.
  // useFocusEffect re-runs every time the tab regains focus instead. It
  // also re-runs whenever `date` changes (a new fetchAttended/fetchRequests
  // closure), so navigating between days refetches too.
  useFocusEffect(useCallback(() => {
    fetchAllClients();
    fetchAttended();
    fetchRequests();
  }, [fetchAllClients, fetchAttended, fetchRequests]));

  const removeRequest = async (id) => {
    await supabase.from('requests').delete().eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const spinValue = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const manualRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, { toValue: 1, duration: 600, easing: Easing.linear, useNativeDriver: true })
    ).start();
    await Promise.all([fetchAllClients(), fetchAttended()]);
    spinValue.stopAnimation();
    setRefreshing(false);
  }, [fetchAllClients, fetchAttended, refreshing, spinValue]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            onPress={manualRefresh}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.refreshBtn}
          >
            <Animated.View style={{
              transform: [{
                rotate: spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
              }],
            }}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </Animated.View>
          </TouchableOpacity>
          <HeaderMenu />
        </View>
      ),
    });
  }, [navigation, manualRefresh, spinValue]);

  const attendedIds = new Set(attended.map(a => a.client_id));
  const [filteredClients, setFilteredClients] = useState([]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const q = search.trim();
      setFilteredClients(
        q ? allClients.filter(c => c.name.includes(q)) : allClients
      );
    }, 120);
    return () => clearTimeout(searchTimer.current);
  }, [search, allClients]);

  const openSearch = () => {
    setSearchOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearch('');
    Keyboard.dismiss();
  };

  const navigateToClient = (clientId) => {
    navigation.navigate('Clients', { screen: 'ClientDetail', params: { clientId } });
  };

  const addAttendance = async (client) => {
    const { data, error } = await supabase
      .from('attendances')
      .insert({ client_id: client.id, date })
      .select('id, client_id')
      .single();

    if (!error && data) {
      setAttended(prev => [
        { id: data.id, client_id: client.id, clients: { id: client.id, name: client.name } },
        ...prev,
      ]);
      setUnpaidCounts(await fetchUnpaidCounts());
    }
  };

  const removeAttendanceByClient = async (clientId) => {
    const row = attended.find(a => a.client_id === clientId);
    if (!row) return;
    await supabase.from('attendances').delete().eq('id', row.id);
    setAttended(prev => prev.filter(a => a.id !== row.id));
    setUnpaidCounts(await fetchUnpaidCounts());
  };

  const removeAttendance = async (attendanceId) => {
    await supabase.from('attendances').delete().eq('id', attendanceId);
    setAttended(prev => prev.filter(a => a.id !== attendanceId));
    setUnpaidCounts(await fetchUnpaidCounts());
  };

  const toggleClient = (client) => {
    if (attendedIds.has(client.id)) removeAttendanceByClient(client.id);
    else addAttendance(client);
  };

  const isToday = date === todayString();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {!searchOpen && <DecorativeBlobs />}
      {/* Date navigation. Note: react-native-web does NOT mirror flexDirection
          row order for RTL here — first child renders left, last renders
          right, regardless of I18nManager. So "previous" (which should sit
          on the right) must be the LAST child, not the first.
          Forward navigation has no upper bound — Shirly needs to be able to
          browse into future dates to leave a בקשה for an upcoming lesson. */}
      <View style={styles.dateRow}>
        <TouchableOpacity
          onPress={() => setDate(d => addDays(d, 1))}
          style={styles.arrow}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={PURPLE} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDateHebrew(date)}</Text>
          {isToday ? (
            <Text style={styles.todayBadge}>היום</Text>
          ) : (
            <TouchableOpacity onPress={() => setDate(todayString())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.todayLink}>חזרה להיום</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setDate(d => addDays(d, -1))} style={styles.arrow}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-forward" size={26} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {/* בקשות for the viewed date — separate from attendance/absence: a
          quick note about a swap or a one-off skip, the kind of thing Shirly
          used to jot in her physical diary. Not searchOpen-gated since it's
          useful regardless of whether the search panel is open. */}
      {!searchOpen && (
        <View style={styles.requestsSection}>
          <View style={styles.requestsHeader}>
            <Text style={styles.sectionTitle}>בקשות</Text>
            <TouchableOpacity onPress={() => setRequestModalOpen(true)} style={styles.addRequestBtn}>
              <Ionicons name="add-circle-outline" size={16} color={PURPLE} />
              <Text style={styles.addRequestBtnText}>הוסף בקשה</Text>
            </TouchableOpacity>
          </View>
          {requests.map(r => (
            <View key={r.id} style={styles.requestRow}>
              <TouchableOpacity onPress={() => removeRequest(r.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-outline" size={18} color="#CCC" />
              </TouchableOpacity>
              <View style={styles.requestInfo}>
                <Text style={styles.requestClientName}>{r.clients?.name ?? ''}</Text>
                {r.note ? <Text style={styles.requestNote}>{r.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Search panel overlay */}
      {searchOpen ? (
        <View style={styles.searchPanel}>
          <View style={styles.searchRow}>
            <TouchableOpacity onPress={closeSearch}>
              <Text style={styles.doneText}>סיום</Text>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="חיפוש לקוח..."
              placeholderTextColor="#AAA"
              value={search}
              onChangeText={setSearch}
              textAlign="right"
              autoCorrect={false}
            />
            <Ionicons name="search-outline" size={20} color="#999" />
          </View>
          <FlatList
            data={filteredClients}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const isIn = attendedIds.has(item.id);
              return (
                <TouchableOpacity
                  style={styles.clientRow}
                  onPress={() => toggleClient(item)}
                >
                  <Ionicons
                    name={isIn ? 'checkmark-circle' : 'add-circle-outline'}
                    size={24}
                    color={isIn ? GREEN : PURPLE}
                  />
                  <View style={styles.debtSlot}>
                    <DebtBadge {...(unpaidCounts[item.id] ?? {})} />
                  </View>
                  <Text style={styles.clientRowName}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <EmptyState icon="search-outline" text="לא נמצאו לקוחות" />
            }
          />
        </View>
      ) : (
        <>
          {/* Add button */}
          <TouchableOpacity style={styles.addBtn} onPress={openSearch}>
            <Ionicons name="person-add-outline" size={20} color={PURPLE} />
            <Text style={styles.addBtnText}>מי הגיעה היום?</Text>
          </TouchableOpacity>

          {/* Attended list */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              הגיעו {attended.length > 0 ? `(${attended.length})` : ''}
            </Text>
          </View>

          {loadingAttended ? (
            <ActivityIndicator color={PURPLE} style={{ marginTop: 32 }} />
          ) : attended.length === 0 ? (
            <EmptyState icon="walk-outline" text="עדיין אף אחד לא סומן" />
          ) : (
            <FlatList
              data={attended}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.attendedItem}>
                  <View style={styles.debtSlot}>
                    <DebtBadge {...(unpaidCounts[item.client_id] ?? {})} />
                  </View>
                  <TouchableOpacity
                    style={styles.attendedNameTouch}
                    onPress={() => navigateToClient(item.client_id)}
                  >
                    <Text style={styles.attendedName}>{item.clients?.name ?? ''}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeAttendance(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-outline" size={20} color="#CCC" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      )}

      <AddRequestModal
        visible={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        fixedDate={date}
        onAdded={(r) => setRequests(prev => [...prev, r])}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  headerRightRow: { flexDirection: 'row', alignItems: 'center' },
  refreshBtn: { marginRight: 16 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 16,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  arrow: { padding: 4 },
  dateCenter: { alignItems: 'center', flex: 1 },
  dateText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  todayBadge: { marginTop: 2, fontSize: 11, color: PURPLE, fontWeight: '600' },
  todayLink: { marginTop: 2, fontSize: 12, color: PURPLE, fontWeight: '700', textDecorationLine: 'underline' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, margin: 12, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: PURPLE,
    borderStyle: 'dashed', backgroundColor: '#FFF',
  },
  addBtnText: { fontSize: 16, color: PURPLE, fontWeight: '600' },

  sectionHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  sectionTitle: { fontSize: 13, color: '#888', fontWeight: '600', textAlign: 'right' },

  requestsSection: {
    margin: 12, marginBottom: 0, backgroundColor: '#FFF', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, padding: 12,
  },
  requestsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addRequestBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addRequestBtnText: { color: PURPLE, fontSize: 13, fontWeight: '700' },
  requestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  requestInfo: { flex: 1 },
  requestClientName: { fontSize: 15, color: '#1A1A1A', fontWeight: '600', textAlign: 'right' },
  requestNote: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 2 },

  attendedItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  attendedNameTouch: { flex: 1 },
  attendedName: { fontSize: 17, color: '#1A1A1A', textAlign: 'right' },
  debtSlot: { minWidth: 28, alignItems: 'flex-start' },

  // Search panel
  searchPanel: { flex: 1, backgroundColor: '#FFF' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 8,
  },
  doneText: { color: PURPLE, fontSize: 15, fontWeight: '700' },
  searchInput: { flex: 1, fontSize: 16, color: '#1A1A1A', textAlign: 'right' },
  clientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 10,
  },
  clientRowName: { flex: 1, fontSize: 17, color: '#1A1A1A', textAlign: 'right' },
});
