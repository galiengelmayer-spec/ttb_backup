import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateRangeShort } from '../lib/dates';
import DateInput from './DateInput';

const PURPLE = '#6B3FA0';
const BORDER = '#E0E0E0';

export default function DateRangePicker({
  ranges,
  onAdd,
  onRemove,
  onSendRange,
  title,
  addButtonLabel = 'הוסף',
  showLabelInput = true,
  labelPlaceholder = 'שם (אופציונלי)',
  emptyText = 'אין טווחים מוגדרים',
  saving = false,
  showPills = true,
  showForm = true,
}) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [label, setLabel] = useState('');

  const handleAdd = () => {
    if (!fromDate || !toDate || fromDate > toDate) return;
    onAdd({
      id: Date.now().toString(),
      label: label.trim() || formatDateRangeShort(fromDate, toDate),
      from: fromDate,
      to: toDate,
    });
    setFromDate('');
    setToDate('');
    setLabel('');
  };

  return (
    <View>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}

      {showPills && (
        ranges.length === 0 ? (
          <Text style={styles.emptyNote}>{emptyText}</Text>
        ) : (
          <View style={styles.pillsRow}>
            {ranges.map(r => (
              <View key={r.id} style={styles.pill}>
                <TouchableOpacity onPress={() => onRemove(r.id)} hitSlop={{ top: 14, bottom: 14, left: 18, right: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
                {onSendRange && (
                  <TouchableOpacity onPress={() => onSendRange(r)} hitSlop={{ top: 14, bottom: 14, left: 4, right: 18 }}>
                    <Ionicons name="paper-plane-outline" size={16} color={PURPLE} />
                  </TouchableOpacity>
                )}
                <Text style={styles.pillText}>
                  {r.label}{'  '}
                  <Text style={styles.pillDates}>{formatDateRangeShort(r.from, r.to)}</Text>
                </Text>
              </View>
            ))}
          </View>
        )
      )}

      {showForm && showLabelInput && (
        <TextInput
          style={styles.labelInput}
          value={label}
          onChangeText={setLabel}
          placeholder={labelPlaceholder}
          placeholderTextColor="#BBB"
          textAlign="right"
        />
      )}

      {showForm && (
        <>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>עד</Text>
              <DateInput value={toDate} onChange={setToDate} />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>מ</Text>
              <DateInput value={fromDate} onChange={setFromDate} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, saving && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.addBtnText}>{addButtonLabel}</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', textAlign: 'right', marginBottom: 8 },
  emptyNote: { fontSize: 14, color: '#BBB', textAlign: 'right', marginBottom: 10 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, justifyContent: 'flex-end' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3EEF9', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#D4C5EF',
  },
  pillText: { fontSize: 13, color: '#3A1A6A', fontWeight: '600', textAlign: 'right' },
  pillDates: { fontSize: 11, color: '#777', fontWeight: '400' },
  labelInput: {
    backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, color: '#1A1A1A',
    borderWidth: 1, borderColor: BORDER, marginBottom: 10,
  },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, color: '#888', textAlign: 'right', marginBottom: 4, fontWeight: '600' },
  addBtn: { backgroundColor: PURPLE, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
