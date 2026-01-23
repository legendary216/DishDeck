import React, { useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { Text, Appbar, ActivityIndicator, Divider, Surface } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<{ today: any; tomorrow: any }>({ today: null, tomorrow: null });

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIdx = new Date().getDay();
  const todayName = days[todayIdx];
  const tomorrowName = days[todayIdx + 1];

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('weekly_plan')
        .select(`day, meal_type, dish:dishes(id, name, image_path)`)
        .eq('user_id', user.id)
        .in('day', [todayName, tomorrowName]);

      if (error) throw error;

      if (data) {
        const mapDay = (dayName: string) => ({
          breakfast: data.find(m => m.day === dayName && m.meal_type === 'Breakfast')?.dish,
          lunch: data.find(m => m.day === dayName && m.meal_type === 'Lunch')?.dish,
          dinner: data.find(m => m.day === dayName && m.meal_type === 'Dinner')?.dish,
        });

        setPlans({ today: mapDay(todayName), tomorrow: mapDay(tomorrowName) });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPlans(); }, []));

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

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{backgroundColor: '#fff'}}>
        <Appbar.Content title="My Kitchen" titleStyle={styles.appTitle} />
        <Appbar.Action icon="calendar-outline" onPress={() => router.push('/(tabs)/planner')} />
      </Appbar.Header>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPlans} />}
      >
        <Text style={styles.sectionHeader}>Today</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          <MealRow label="Breakfast" dish={plans.today?.breakfast} />
          <Divider />
          <MealRow label="Lunch" dish={plans.today?.lunch} />
          <Divider />
          <MealRow label="Dinner" dish={plans.today?.dinner} />
        </Surface>

        <Text style={[styles.sectionHeader, { marginTop: 30 }]}>Tomorrow</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          <MealRow label="Breakfast" dish={plans.tomorrow?.breakfast} />
          <Divider />
          <MealRow label="Lunch" dish={plans.tomorrow?.lunch} />
          <Divider />
          <MealRow label="Dinner" dish={plans.tomorrow?.dinner} />
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
});