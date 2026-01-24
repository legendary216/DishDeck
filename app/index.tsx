import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

export default function Index() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      
      {/* 1. CENTERED STYLED TEXT */}
      <View style={styles.centerContent}>
        <View style={styles.textWrapper}>
          <Text style={styles.lightText}>Welcome</Text>
          <Text style={styles.lightText}>To</Text>
          <Text style={styles.brandText}>DishDeck</Text>
        </View>
        
        {/* A small decorative underline under the brand name */}
        <View style={styles.accentBar} />
      </View>

      {/* 2. LOADING SECTION */}
      <View style={styles.footer}>
        <ActivityIndicator animating={true} color="white" />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    alignItems: 'center',
  },
  lightText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 24,
    fontWeight: '300',
    textTransform: 'uppercase',
    letterSpacing: 4,
    lineHeight: 32,
  },
  brandText: {
    color: 'white',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 5,
  },
  accentBar: {
    width: 40,
    height: 3,
    backgroundColor: 'white',
    marginTop: 20,
    borderRadius: 2,
  },
  footer: {
    paddingBottom: 80,
    alignItems: 'center',
  },
});