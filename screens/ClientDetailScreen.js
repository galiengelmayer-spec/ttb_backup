import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, TextInput, Linking, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { formatDateHebrew, todayString } from '../lib/dates';
import { computeCycleStats, CYCLE_LENGTH } from '../lib/cycles';
import { confirmAsync, alertAsync } from '../lib/confirm';
import { toWhatsAppLink, DEFAULT_REMINDER_TEMPLATE } from '../lib/whatsapp';
import DateRangePicker from '../components/DateRangePicker';
import DebtBadge from '../components/DebtBadge';

const PURPLE = '#6B3FA0';
const BLUE = '#1565C0';
const GREEN = '#2E7D32';
const RED = '#C62828';
const BORDER = '#E0E0E0';

const MONTHS_HE = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
];

export default function ClientDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeClientId = route.params?.clientId ?? null;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [client, setClient] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const [allAttendances, setAllAttendances] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(!!routeClientId);
  const [reminderTemplate, setReminderTemplate] = useState(DEFAULT_REMINDER_TEMPLATE);
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);

  // Every ticket is always 10 lessons, always paid — Shirly only adds one
  // once she's actually received payment, so there's nothing left to ask.
  const [lastAddedPurchaseId, setLastAddedPurchaseId] = useState(null);

  const clientId = client?.id ?? routeClientId;

  // React Navigation reuses the same ClientDetail screen instance when you
  // navigate to it again (e.g. "לקוח חדש" while another client's card is
  // already in the stack) — it does NOT remount. Without this, all the
  // state below stays stale and you'd keep seeing the previous client.
  // Skip the reset when client.id already matches (e.g. right after
  // creating a brand-new client, where setClient ran just before
  // navigation.setParams updated this same id).
  useEffect(() => {
    if (client?.id === routeClientId) return;
    setClient(null);
    setNameInput('');
    setPhoneInput('');
    setAllAttendances([]);
    setPurchases([]);
    setAbsences([]);
    setLastAddedPurchaseId(null);
    setYear(new Date().getFullYear());
    setMonth(new Date().getMonth());
    setLoading(!!routeClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeClientId]);

  const fetchClient = useCallback(async () => {
    if (!routeClientId) return;
    const { data } = await supabase.from('clients').select('*').eq('id', routeClientId).single();
    if (data) {
      setClient(data);
      setNameInput(data.name);
      setPhoneInput(data.phone ?? '');
    }
  }, [routeClientId]);

  const fetchAttendances = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('attendances')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: true });
    setAllAttendances(data ?? []);
    setLoading(false);
  }, [clientId]);

  const fetchPurchases = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('purchases')
      .select('*')
      .eq('client_id', clientId)
      .order('purchased_at', { ascending: true });
    setPurchases(data ?? []);
  }, [clientId]);

  const fetchAbsences = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('client_absences')
      .select('*')
      .eq('client_id', clientId)
      .order('from_date', { ascending: false });
    setAbsences((data ?? []).map(a => ({ id: a.id, label: a.reason || 'היעדרות', from: a.from_date, to: a.to_date })));
  }, [clientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);
  useFocusEffect(useCallback(() => {
    fetchAttendances();
    fetchPurchases();
    fetchAbsences();
  }, [fetchAttendances, fetchPurchases, fetchAbsences]));

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'reminder_message_template').maybeSingle()
      .then(({ data }) => setReminderTemplate(data?.value || DEFAULT_REMINDER_TEMPLATE));
  }, []);

  const stats = computeCycleStats(allAttendances, purchases);
  const monthFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  // allAttendances is already chronological ascending from the query.
  const monthAttendances = allAttendances.filter(a => a.date >= monthFrom && a.date <= monthTo);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const goBack = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const goForward = () => {
    if (isCurrentMonth) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // --- Existing clients auto-save on blur, same as everywhere else in the app ---
  const handleNameBlur = async () => {
    if (!client || !nameInput.trim()) return;
    if (nameInput.trim() !== client.name) {
      await supabase.from('clients').update({ name: nameInput.trim() }).eq('id', client.id);
      setClient(prev => prev ? { ...prev, name: nameInput.trim() } : prev);
    }
  };

  const handlePhoneBlur = async () => {
    if (!client) return;
    if (phoneInput.trim() !== (client.phone ?? '')) {
      await supabase.from('clients').update({ phone: phoneInput.trim() || null }).eq('id', client.id);
      setClient(prev => prev ? { ...prev, phone: phoneInput.trim() || null } : prev);
    }
  };

  // --- New clients only get created on an explicit Save tap. A first
  // ticket is part of the same save unless she explicitly skips it. ---
  const saveNewClient = async (withTicket) => {
    if (!nameInput.trim()) {
      await alertAsync('שגיאה', 'נא להזין שם');
      return;
    }
    const { data, error } = await supabase
      .from('clients')
      .insert({ name: nameInput.trim(), phone: phoneInput.trim() || null, active: true })
      .select()
      .single();
    if (error || !data) {
      await alertAsync('שגיאה', 'לא ניתן היה לשמור את הלקוח');
      return;
    }
    if (withTicket) {
      await supabase.from('purchases').insert({
        client_id: data.id,
        lessons_count: CYCLE_LENGTH,
        paid: true,
        purchased_at: todayString(),
      });
    }
    navigation.goBack();
  };

  // --- Payment reminder — now about running low on prepaid lessons, not
  // unpaid history, so it tracks "sent" against the prepaid balance. ---
  const sendPaymentReminder = async () => {
    const link = toWhatsAppLink(phoneInput, reminderTemplate);
    if (!link) {
      await alertAsync('אין מספר טלפון', 'הוסיפי מספר טלפון לפני השליחה.');
      return;
    }
    await Linking.openURL(link);
    if (stats.remaining <= 1 && stats.last) {
      await supabase.from('attendances').update({ reminder_sent_at: todayString() }).eq('id', stats.last.id);
      setAllAttendances(prev => prev.map(a => a.id === stats.last.id ? { ...a, reminder_sent_at: todayString() } : a));
    }
  };

  // --- Absences ---
  const addAbsence = async (entry) => {
    if (!clientId) return;
    const { data } = await supabase
      .from('client_absences')
      .insert({ client_id: clientId, from_date: entry.from, to_date: entry.to, reason: entry.label })
      .select()
      .single();
    if (data) {
      setAbsences(prev => [{ id: data.id, label: data.reason || 'היעדרות', from: data.from_date, to: data.to_date }, ...prev]);
    }
    setAbsenceModalOpen(false);
  };
  const removeAbsence = async (id) => {
    await supabase.from('client_absences').delete().eq('id', id);
    setAbsences(prev => prev.filter(a => a.id !== id));
  };

  // --- Tickets — always 10 lessons, always paid, added the moment Shirly
  // actually receives payment. Nothing to configure, so this is one tap. ---
  const addNewTicket = async () => {
    const { data } = await supabase
      .from('purchases')
      .insert({ client_id: clientId, lessons_count: CYCLE_LENGTH, paid: true, purchased_at: todayString() })
      .select()
      .single();
    if (data) {
      setPurchases(prev => [...prev, data]);
      setLastAddedPurchaseId(data.id);
    }
  };

  // Undo only ever reverses the single most recently added ticket from this
  // session — a quick way back from a misclick, not a general delete tool.
  const undoLastPurchase = async () => {
    if (!lastAddedPurchaseId) return;
    await supabase.from('purchases').delete().eq('id', lastAddedPurchaseId);
    setPurchases(prev => prev.filter(p => p.id !== lastAddedPurchaseId));
    setLastAddedPurchaseId(null);
  };

  const deleteClient = async () => {
    const ok = await confirmAsync('מחיקת לקוח', `למחוק את ${client?.name}? פעולה זו לא ניתנת לביטול.`);
    if (!ok) return;
    await supabase.from('clients').update({ active: false }).eq('id', clientId);
    navigation.goBack();
  };

  const ticketsNewestFirst = [...purchases].sort((a, b) => (a.purchased_at < b.purchased_at ? 1 : -1));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={monthAttendances}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            {/* Top bar: add-absence + delete, grouped on the right
                (the native header already provides a back arrow) */}
            {clientId ? (
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => setAbsenceModalOpen(true)} style={styles.addAbsenceBtn}>
                  <Ionicons name="airplane-outline" size={16} color={PURPLE} />
                  <Text style={styles.addAbsenceBtnText}>הוסף היעדרות</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={deleteClient} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.cancelBtnText}>ביטול</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Name / phone */}
            <View style={styles.section}>
              <Text style={styles.label}>שם</Text>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={setNameInput}
                onBlur={handleNameBlur}
                placeholder="שם מלא"
                placeholderTextColor="#BBB"
                textAlign="right"
              />
              <Text style={styles.label}>טלפון</Text>
              <TextInput
                style={styles.input}
                value={phoneInput}
                onChangeText={setPhoneInput}
                onBlur={handlePhoneBlur}
                placeholder="050-0000000"
                placeholderTextColor="#BBB"
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            {!clientId && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>כרטיסייה ראשונה</Text>
                <Text style={styles.ticketHint}>כרטיסייה של {CYCLE_LENGTH} שיעורים, מסומנת כשולמה</Text>
              </View>
            )}

            {!clientId && (
              <>
                <TouchableOpacity style={styles.saveNewBtn} onPress={() => saveNewClient(true)}>
                  <Text style={styles.saveNewBtnText}>שמור לקוח</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => saveNewClient(false)} style={styles.skipTicketLink}>
                  <Text style={styles.skipTicketLinkText}>שמור בלי כרטיסייה, אמשיך מאוחר יותר</Text>
                </TouchableOpacity>
              </>
            )}

            {clientId && (
              <>
                {/* Absences — pills only; the add-form lives in a popup */}
                {absences.length > 0 && (
                  <View style={styles.section}>
                    <DateRangePicker
                      title="ימי היעדרות"
                      ranges={absences}
                      onRemove={removeAbsence}
                      showForm={false}
                    />
                  </View>
                )}

                {/* Month navigation. DOM order = visual order here (not
                    RTL-mirrored) — "previous" must be the LAST child to land
                    on the right. */}
                <View style={styles.monthRow}>
                  <TouchableOpacity
                    onPress={goForward}
                    style={[styles.arrow, isCurrentMonth && styles.arrowDisabled]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="chevron-back" size={24} color={isCurrentMonth ? '#CCC' : PURPLE} />
                  </TouchableOpacity>
                  <Text style={styles.monthLabel}>{MONTHS_HE[month]} {year}</Text>
                  <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="chevron-forward" size={24} color={PURPLE} />
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <ActivityIndicator color={PURPLE} style={{ marginTop: 32 }} />
                ) : monthAttendances.length === 0 ? (
                  <Text style={styles.emptyText}>אין שיעורים בחודש זה</Text>
                ) : null}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.dateText}>{formatDateHebrew(item.date)}</Text>
          </View>
        )}
        ListFooterComponent={
          clientId ? (
            <View>
              {/* Tickets */}
              <View style={styles.section}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.sectionTitle}>כרטיסיות</Text>
                  <DebtBadge unpaidCount={stats.unpaidCount} overdraftCount={stats.overdraftCount} />
                </View>

                {/* The number Shirly actually needs to answer "why isn't
                    this lesson showing as debt" — total purchased lessons
                    can span several tickets, so it's not obvious from the
                    tickets list alone how much balance is left to use. */}
                {stats.totalPurchased > 0 && (
                  <Text style={styles.remainingText}>נותרו {stats.remaining} שיעורים בכרטיסיות</Text>
                )}

                {ticketsNewestFirst.length === 0 ? (
                  <Text style={styles.noTicketsText}>אין כרטיסיות עדיין</Text>
                ) : (
                  ticketsNewestFirst.map(p => {
                    const used = stats.ticketUsage[p.id] ?? 0;
                    const isUsedUp = used >= p.lessons_count;
                    return (
                      <View key={p.id} style={styles.ticketRow}>
                        <Ionicons
                          name={isUsedUp ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={isUsedUp ? GREEN : PURPLE}
                        />
                        <Text style={styles.ticketCount}>{used}/{p.lessons_count}</Text>
                        <Text style={styles.ticketDate}>{formatDateHebrew(p.purchased_at)}</Text>
                      </View>
                    );
                  })
                )}

                {/* Selling a new card before the current one is nearly done
                    would double-count balance — keep it disabled until she's
                    down to her last couple of lessons. */}
                <TouchableOpacity
                  style={[styles.sellTicketBtn, stats.remaining > 2 && styles.sellTicketBtnDisabled]}
                  onPress={addNewTicket}
                  disabled={stats.remaining > 2}
                >
                  <Ionicons name="add-circle-outline" size={18} color={stats.remaining > 2 ? '#BBB' : PURPLE} />
                  <Text style={[styles.sellTicketBtnText, stats.remaining > 2 && styles.sellTicketBtnTextDisabled]}>
                    כרטיסיה חדשה
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Lives outside the tickets card on purpose — undo needs to
                  stay reachable regardless of how the list above re-renders. */}
              {lastAddedPurchaseId && (
                <TouchableOpacity
                  onPress={undoLastPurchase}
                  style={styles.undoLinkStandalone}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.undoLinkText}>בטל הוספת כרטיסייה</Text>
                </TouchableOpacity>
              )}

              {/* WhatsApp reminder */}
              <View style={styles.section}>
                <TouchableOpacity style={styles.reminderBtn} onPress={sendPaymentReminder}>
                  <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                  <Text style={styles.reminderBtnText}>שלח תזכורת תשלום</Text>
                </TouchableOpacity>
                {stats.remaining <= 1 && stats.last?.reminder_sent_at && (
                  <Text style={styles.reminderSentText}>
                    נשלחה תזכורת ב-{formatDateHebrew(stats.last.reminder_sent_at)}
                  </Text>
                )}
              </View>
            </View>
          ) : null
        }
      />

      <Modal
        visible={absenceModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAbsenceModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setAbsenceModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>הוסף היעדרות</Text>
            </View>
            <DateRangePicker
              ranges={absences}
              onAdd={addAbsence}
              showPills={false}
              addButtonLabel="הוסף היעדרות"
              labelPlaceholder="סיבה (חופשה, מחלה...)"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  addAbsenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addAbsenceBtnText: { color: PURPLE, fontSize: 14, fontWeight: '600' },
  cancelBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
  saveNewBtn: {
    backgroundColor: PURPLE, margin: 12, marginTop: 0, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveNewBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  skipTicketLink: { alignSelf: 'center', marginBottom: 16 },
  skipTicketLinkText: { color: '#999', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  section: {
    backgroundColor: '#FFF', margin: 12, marginBottom: 0,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', textAlign: 'right' },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 13, color: '#888', fontWeight: '600', textAlign: 'right', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 16, color: '#1A1A1A', borderWidth: 1, borderColor: BORDER,
  },
  reminderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 12,
  },
  reminderBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  reminderSentText: { fontSize: 12, color: GREEN, textAlign: 'right', marginTop: 8, fontWeight: '600' },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, margin: 12, marginBottom: 0,
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: BORDER,
  },
  arrow: {},
  arrowDisabled: { opacity: 0.3 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  emptyText: { textAlign: 'center', color: '#BBB', marginTop: 24, fontSize: 16 },

  ticketHint: { fontSize: 13, color: '#888', textAlign: 'right', marginTop: 4 },
  undoLinkStandalone: { alignSelf: 'center', marginVertical: 10 },
  undoLinkText: { fontSize: 13, color: '#999', fontWeight: '600', textDecorationLine: 'underline' },

  noTicketsText: { textAlign: 'right', color: '#BBB', fontSize: 14, marginBottom: 8 },
  remainingText: { textAlign: 'right', color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  ticketRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  ticketDate: { fontSize: 13, color: '#888', flex: 1, textAlign: 'right' },
  ticketCount: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
  sellTicketBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1.5, borderColor: PURPLE, borderStyle: 'dashed',
  },
  sellTicketBtnDisabled: { borderColor: '#DDD' },
  sellTicketBtnText: { color: PURPLE, fontSize: 14, fontWeight: '700' },
  sellTicketBtnTextDisabled: { color: '#BBB' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  dateText: { fontSize: 14, color: '#1A1A1A', textAlign: 'right', flex: 1 },
});
