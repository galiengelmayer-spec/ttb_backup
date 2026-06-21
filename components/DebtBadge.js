import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BLUE = '#1565C0';
const BLUE_BG = '#E3F2FD';
const BLUE_BORDER = '#90CAF9';
const RED = '#C62828';
const RED_BG = '#FDE4E4';
const RED_BORDER = '#F2A8A8';

// Shows nothing when fully paid up. A blue pill when the debt comes from a
// ticket she already has, just not paid for yet — informational, not
// alarming. A red pill only when some of it is true overdraft: lessons
// attended with no ticket backing them at all, which in practice should
// never run past a lesson or two before payment gets sorted out.
export default function DebtBadge({ unpaidCount, overdraftCount = 0 }) {
  if (!unpaidCount || unpaidCount <= 0) return null;
  const severe = overdraftCount > 0;
  return (
    <View style={[styles.pill, severe ? styles.pillSevere : styles.pillNormal]}>
      <Text style={[styles.text, severe ? styles.textSevere : styles.textNormal]}>
        {unpaidCount}
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
});
