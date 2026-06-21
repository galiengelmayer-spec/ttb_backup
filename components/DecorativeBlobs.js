import React from 'react';
import { View, StyleSheet } from 'react-native';

// Purely decorative, low-opacity shapes for otherwise-empty white space.
// Deliberately subtle — never a foreground element, never a distraction
// from the actual task, never tappable.
export default function DecorativeBlobs() {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
      <View style={[styles.blob, styles.blobThree]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  blobOne: {
    width: 220, height: 220, backgroundColor: '#6B3FA0', opacity: 0.06,
    top: -60, right: -70,
  },
  blobTwo: {
    width: 280, height: 280, backgroundColor: '#C2185B', opacity: 0.05,
    bottom: -100, left: -90,
  },
  blobThree: {
    width: 150, height: 150, backgroundColor: '#8E5BC4', opacity: 0.07,
    bottom: 120, right: -50,
  },
});
