import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Deep-to-bright blue base, kept dark enough at the title's position for
// white header text to stay readable — the soft "glow" circles are pushed
// toward the corners so they never sit directly behind the title.
export const GRADIENT_COLORS = ['#1B4D7A', '#2F6FA8', '#4F93C9'];

export default function HeaderGradient() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.glowTopLeft} />
      <View pointerEvents="none" style={styles.glowBottomRight} />
      <View pointerEvents="none" style={styles.glowSoft} />
    </View>
  );
}

const styles = StyleSheet.create({
  glowTopLeft: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#FFFFFF', opacity: 0.16, top: -70, left: -40,
  },
  glowBottomRight: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#D6EEFB', opacity: 0.28, bottom: -130, right: -60,
  },
  glowSoft: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#FFFFFF', opacity: 0.10, top: -40, right: 60,
  },
});
