import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const BORDER = '#E0E0E0';

// Search-to-select client widget — once a client is picked, collapses to a
// single chip with an X to clear and search again.
export default function ClientPicker({ selectedClient, onSelect }) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from('clients').select('id, name').eq('active', true).order('name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  if (selectedClient) {
    return (
      <View style={styles.selectedRow}>
        <TouchableOpacity onPress={() => onSelect(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={20} color="#888" />
        </TouchableOpacity>
        <Text style={styles.selectedName}>{selectedClient.name}</Text>
      </View>
    );
  }

  const filtered = search.trim()
    ? clients.filter(c => c.name.includes(search.trim()))
    : clients;

  return (
    <View>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={t => { setSearch(t); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="חיפוש לקוח..."
        placeholderTextColor="#BBB"
        textAlign="right"
      />
      {open && (
        <View style={styles.dropdown}>
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="always"
            style={{ maxHeight: 180 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => { onSelect(item); setOpen(false); setSearch(''); }}
              >
                <Text style={styles.optionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>לא נמצאו לקוחות</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, color: '#1A1A1A', borderWidth: 1, borderColor: BORDER,
  },
  dropdown: {
    backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: BORDER,
    marginTop: 4, maxHeight: 180, overflow: 'hidden',
  },
  option: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  optionText: { fontSize: 15, color: '#1A1A1A', textAlign: 'right' },
  emptyText: { padding: 12, color: '#BBB', textAlign: 'center', fontSize: 13 },
  selectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3EEF9', borderRadius: 8, borderWidth: 1, borderColor: '#D4C5EF',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  selectedName: { flex: 1, fontSize: 15, color: '#3A1A6A', fontWeight: '600', textAlign: 'right' },
});
