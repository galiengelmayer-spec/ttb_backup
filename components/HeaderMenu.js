import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { confirmAsync, alertAsync } from '../lib/confirm';
import { downloadBackupCsv } from '../lib/backup';

export default function HeaderMenu() {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const goToSettings = () => {
    setOpen(false);
    navigation.navigate('Settings');
  };

  const goToRequests = () => {
    setOpen(false);
    navigation.navigate('Requests');
  };

  const exportBackup = async () => {
    setOpen(false);
    if (exporting) return;
    setExporting(true);
    try {
      await downloadBackupCsv();
    } catch (e) {
      await alertAsync('שגיאה', 'לא ניתן היה להוריד את הגיבוי');
    } finally {
      setExporting(false);
    }
  };

  const resetSystem = async () => {
    setOpen(false);
    const ok = await confirmAsync('איפוס מערכת', 'פעולה זו תמחק את כל הלקוחות לדוגמה. לקוחות אמיתיים לא יימחקו.');
    if (!ok) return;
    const { error } = await supabase.from('clients').delete().eq('is_mock', true);
    if (error) await alertAsync('שגיאה', 'לא ניתן לאפס את המערכת');
    else await alertAsync('בוצע', 'המערכת אופסה בהצלחה');
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        style={styles.kebabBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
      </TouchableOpacity>

      {open && (
        <View style={styles.menu}>
          <TouchableOpacity onPress={goToRequests} style={styles.menuItem}>
            <Text style={styles.menuItemText}>בקשות</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity onPress={goToSettings} style={styles.menuItem}>
            <Text style={styles.menuItemText}>הגדרות</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity onPress={exportBackup} style={styles.menuItem} disabled={exporting}>
            <Text style={styles.menuItemText}>{exporting ? 'מוריד...' : 'הורדת גיבוי (CSV)'}</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity onPress={resetSystem} style={styles.menuItem}>
            <Text style={styles.menuItemText}>אפס מערכת</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kebabBtn: { marginRight: 16 },
  menu: {
    position: 'absolute', top: 32, right: 0,
    backgroundColor: '#FFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0',
    minWidth: 150, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 6,
    zIndex: 100,
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { fontSize: 15, color: '#1A1A1A', textAlign: 'right', fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#F0F0F0' },
});
