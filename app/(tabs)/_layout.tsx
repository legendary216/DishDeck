import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform, Vibration, Pressable } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Text, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Keep your screen imports
import DashboardScreen from './index';
import PlannerScreen from './planner';
import LibraryScreen from './library'; 

export default function TabLayout() {
  const [index, setIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const theme = useTheme();

  const routes = [
    { key: 0, title: 'Home', icon: 'home-variant', iconOutline: 'home-variant-outline' },
    { key: 1, title: 'Planner', icon: 'calendar-month', iconOutline: 'calendar-month-outline' },
    { key: 2, title: 'Library', icon: 'bookmark', iconOutline: 'bookmark-outline' },
  ];

  const handleTabPress = (i: number) => {
    // Optional: Subtle vibration (haptic feedback)
    Vibration.vibrate(10);
    setIndex(i);
    pagerRef.current?.setPage(i);
  };

  const onPageSelected = (e: any) => {
    setIndex(e.nativeEvent.position);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* 1. Swipeable Content */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        <View key="0"><DashboardScreen /></View>
        <View key="1"><PlannerScreen /></View>
        <View key="2"><LibraryScreen /></View>
      </PagerView>

      {/* 2. Modern Bottom Bar (No Ripple/Shadow) */}
      <Surface style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]} elevation={2}>
        {routes.map((route, i) => {
          const isFocused = index === i;
          
          const activeColor = theme.colors.onSecondaryContainer;
          const inactiveColor = theme.colors.onSurfaceVariant;
          const pillColor = isFocused ? theme.colors.secondaryContainer : 'transparent';

          return (
            <Pressable
              key={route.key}
              onPress={() => handleTabPress(i)}
              style={styles.tabItem}
              android_ripple={null} // explicitly disable android ripple
            >
              <View style={styles.tabContent}>
                {/* The "Pill" Background */}
                <View style={[styles.iconPill, { backgroundColor: pillColor }]}>
                    <MaterialCommunityIcons 
                        name={isFocused ? route.icon : route.iconOutline as any} 
                        size={24} 
                        color={isFocused ? activeColor : inactiveColor} 
                    />
                </View>
                
                {/* Text Label */}
                <Text 
                    style={[
                        styles.tabLabel, 
                        { 
                            color: isFocused ? theme.colors.onSurface : inactiveColor,
                            fontWeight: isFocused ? '700' : '500'
                        }
                    ]}
                >
                    {route.title}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pagerView: { flex: 1 },
  
  bottomBar: {
    flexDirection: 'row',
    height: 80,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    borderTopWidth: 0.5,
    elevation: 0,
  },
  
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  
  tabContent: {
    alignItems: 'center',
  },
  
  iconPill: {
    width: 64,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  tabLabel: {
    fontSize: 12,
  }
});