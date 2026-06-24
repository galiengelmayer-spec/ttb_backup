import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BLUE = '#1565C0';
const BLUE_BG = '#E3F2FD';
const BLUE_BORDER = '#90CAF9';
const RED = '#C62828';
const RED_BG = '#FDE4E4';
const RED_BORDER = '#F2A8A8';

// A single signal, nothing else — ticket size is always 10 and never worth
// showing. See lib/cycles.js pillStateFromStats for how `kind`/`value` are
// derived; this component just renders whichever of the four states it's
// given:
//  - 'overdraft' → red number (the urgent one)
//  - 'progress'  → blue number (just informational)
//  - 'noTicket'  → small gray "אין כרטיסייה" text, no number
//  - 'empty'     → nothing
export default function LessonCountBadge({ kind, value }) {
  if (!kind || kind === 'empty') return null;
  if (kind === 'noTicket') {
    return <Text style={styles.noTicketText}>אין כרטיסייה</Text>;
  }
  const severe = kind === 'overdraft';
  return (
    <View style={[styles.pill, severe ? styles.pillSevere : styles.pillNormal]}>
      <Text style={[styles.text, severe ? styles.textSevere : styles.textNormal]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1.5, alignSelf: 'flex-start',
  },
  pillNormal: { backgroundColor: BLUE_BG, borderColor: BLUE_BORDER },
  pillSevere: { backgroundColor: RED_BG, borderColor: RED_BORDER },
  text: { fontSize: 13, fontWeight: '700' },
  textNormal: { color: BLUE },
  textSevere: { color: RED, fontWeight: '800' },
  noTicketText: { fontSize: 11, color: '#AAA', fontWeight: '500' },
});
