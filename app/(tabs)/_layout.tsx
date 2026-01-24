import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Appbar, TouchableRipple, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Keep your screen imports
import DashboardScreen from './index';
import PlannerScreen from './planner';
import LibraryScreen from './library'; 

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TabLayout() {
  const [index, setIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const theme = useTheme();

  const routes = [
    { key: 0, title: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { key: 1, title: 'Planner', icon: 'calendar-range', iconOutline: 'calendar-range-outline' },
    { key: 2, title: 'Library', icon: 'book-multiple', iconOutline: 'book-multiple-outline' },
  ];

  const handleTabPress = (i: number) => {
    setIndex(i);
    pagerRef.current?.setPage(i);
  };

  const onPageSelected = (e: any) => {
    setIndex(e.nativeEvent.position);
  };

  return (
    <View style={styles.container}>
      {/* 1. The Swipeable Content Area */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={onPageSelected}
        scrollEnabled={true} 
      >
        <View key="0" style={styles.page}><DashboardScreen /></View>
        <View key="1" style={styles.page}><PlannerScreen /></View>
        <View key="2" style={styles.page}><LibraryScreen /></View>
      </PagerView>

      {/* 2. Custom Bottom Bar (No Black Screen Issues) */}
      <View style={styles.bottomBar}>
        {routes.map((route, i) => {
          const isFocused = index === i;
          const iconName = isFocused ? route.icon : route.iconOutline;
          const color = isFocused ? '#6200ee' : '#757575';

          return (
            <TouchableRipple
              key={route.key}
              onPress={() => handleTabPress(i)}
              style={styles.tabItem}
              rippleColor="rgba(98, 0, 238, .1)"
            >
              <View style={styles.tabContent}>
                <MaterialCommunityIcons name={iconName as any} size={24} color={color} />
                <Text style={[styles.tabLabel, { color }]}>{route.title}</Text>
              </View>
            </TouchableRipple>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  pagerView: { flex: 1 }, // Takes all available space above the bar
  page: { flex: 1 },
  
  bottomBar: {
    flexDirection: 'row',
    height: 60, // Fixed height prevents it from growing
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    paddingBottom: 5 // Space for home bar
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  }
});