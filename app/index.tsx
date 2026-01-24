import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme, Avatar } from 'react-native-paper';

export default function Index() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      
      {/* 1. BRANDING SECTION */}
      <View style={styles.logoContainer}>
        {/* App Icon Circle */}
        <View style={styles.iconCircle}>
             <Avatar.Icon 
                size={64} 
                icon="chef-hat" 
                color={theme.colors.primary} 
                style={{ backgroundColor: 'white' }} 
             />
        </View>
        
        {/* App Title */}
        <Text variant="displayMedium" style={styles.title}>
          DishDeck
        </Text>
        
        {/* Tagline */}
        <Text variant="titleMedium" style={styles.tagline}>
          Your Kitchen, Organized.
        </Text>
      </View>

      {/* 2. LOADING SECTION (Bottom) */}
      <View style={styles.loaderContainer}>
        <ActivityIndicator animating={true} color="white" size="large" />
        <Text variant="bodySmall" style={styles.loadingText}>
            Setting up your kitchen...
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50, // Pushes it slightly above center
  },
  iconCircle: {
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 5,
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 20,
  },
  title: {
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  tagline: {
    color: 'rgba(255,255,255,0.8)', // Slightly transparent white
    marginTop: 5,
    fontWeight: '500',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 50, // Anchored to bottom
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 10,
  }
});