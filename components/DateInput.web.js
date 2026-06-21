import React from 'react';

// Real browser date picker. react-native-web's TextInput does not reliably
// forward `type="date"` to the underlying <input>, which silently produced
// free-text dates the rest of the app couldn't parse (e.g. failed inserts
// for absences). Rendering a plain <input> here sidesteps that entirely.
export default function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 14,
        color: '#1A1A1A',
        border: '1px solid #E0E0E0',
        textAlign: 'right',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
      }}
    />
  );
}
