import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

// Native fallback (web has its own .web.js implementation with a real date picker)
export default function DateInput({ value, onChange }) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor="#BBB"
      textAlign="right"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, color: '#1A1A1A',
    borderWidth: 1, borderColor: '#E0E0E0', textAlign: 'right',
  },
});
