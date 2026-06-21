import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PURPLE = '#6B3FA0';

export default function EmptyState({ icon = 'sparkles-outline', text }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={PURPLE} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginTop: 56, gap: 12 },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#F3EEF9',
    alignItems: 'center', justifyContent: 'center',
  },
  text: { textAlign: 'center', color: '#999', fontSize: 16 },
});
