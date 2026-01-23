import React, { useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { Text, Appbar, ActivityIndicator, Divider, Surface } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';
import { usePlan } from '../../context/PlanContext';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<{ today: any; tomorrow: any }>({ today: null, tomorrow: null });

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIdx = new Date().getDay();
  const todayName = days[todayIdx];
  const tomorrowName = days[todayIdx + 1];
  const { globalPlans, setGlobalPlans } = usePlan();

 const fetchPlans = async () => {
  // If we already have data in globalPlans, do NOT show the spinner.
  // This allows for a "silent refresh" in the background.
  if (globalPlans.today) {
    setLoading(false);
  } else {
    setLoading(true);
  }

  try {
    // ... rest of your supabase code ...
  } finally {
    setLoading(false); // Ensure it always turns off at the end
  }
};

  useFocusEffect(
  useCallback(() => {
    // Only fetch if we DON'T have data yet, OR 
    // run it silently if we do.
    fetchPlans(); 
  }, [globalPlans]) // Adding globalPlans here can sometimes cause a loop, 
                   // try an empty dependency array [] first to test.
);

  // --- MINIMALIST MEAL ROW ---
  const MealRow = ({ label, dish }: { label: string; dish: any }) => (
    <TouchableOpacity 
      style={styles.mealRow}
      onPress={() => dish ? router.push({ pathname: '/dish/[id]', params: { id: dish.id } }) : router.push('/(tabs)/planner')}
    >
      <View style={styles.textSide}>
        <Text style={styles.mealLabel}>{label.toUpperCase()}</Text>
        <Text numberOfLines={1} style={dish ? styles.dishName : styles.emptyName}>
          {dish ? dish.name : 'Tap to plan'}
        </Text>
      </View>
      
      {dish?.image_path ? (
        <Image source={{ uri: dish.image_path }} style={styles.mealImage} />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}
    </TouchableOpacity>
  );
  if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator animating={true} color="#6200ee" size="large" />
      <Text style={{ marginTop: 10, color: '#666' }}>Fetching your menu...</Text>
    </View>
  );
}
  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{backgroundColor: '#fff'}}>
        <Appbar.Content title="My Kitchen" titleStyle={styles.appTitle} />
        <Appbar.Action 
    icon="cart-outline" 
    onPress={() => router.push('/shop')} 
  />
        <Appbar.Action icon="calendar-outline" onPress={() => router.push('/(tabs)/planner')} />
      </Appbar.Header>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPlans} />}
      >
        <Text style={styles.sectionHeader}>Today</Text>
       <Surface style={styles.sectionCard} elevation={1}>
  {/* Point to globalPlans here */}
  <MealRow label="Breakfast" dish={globalPlans.today?.breakfast} />
  <Divider />
  <MealRow label="Lunch" dish={globalPlans.today?.lunch} />
  <Divider />
  <MealRow label="Dinner" dish={globalPlans.today?.dinner} />
</Surface>

<Text style={[styles.sectionHeader, { marginTop: 30 }]}>Tomorrow</Text>
<Surface style={styles.sectionCard} elevation={1}>
  {/* Point to globalPlans here */}
  <MealRow label="Breakfast" dish={globalPlans.tomorrow?.breakfast} />
  <Divider />
  <MealRow label="Lunch" dish={globalPlans.tomorrow?.lunch} />
  <Divider />
  <MealRow label="Dinner" dish={globalPlans.tomorrow?.dinner} />
</Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  appTitle: { fontWeight: '700', fontSize: 20, letterSpacing: -0.5 },
  scrollContent: { padding: 20 },
  sectionHeader: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#9E9E9E', 
    textTransform: 'uppercase', 
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 5
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF'
  },
  textSide: { flex: 1 },
  mealLabel: { fontSize: 10, fontWeight: '700', color: '#6200EE', marginBottom: 2 },
  dishName: { fontSize: 17, fontWeight: '600', color: '#212121' },
  emptyName: { fontSize: 17, color: '#BDBDBD', fontStyle: 'italic' },
  mealImage: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F5F5F5' },
  imagePlaceholder: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0', borderStyle: 'dashed' },
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FAFAFA' // Match your app background
  },


});