import React, { useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Image, Alert } from 'react-native';
import { Text, Appbar, ActivityIndicator, Divider, Card, List, useTheme } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';
import { usePlan } from '../../context/PlanContext';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false); // <--- New State for Logout Spinner
  
  const theme = useTheme(); 
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIdx = new Date().getDay();
  const todayName = days[todayIdx];
  const tomorrowName = days[todayIdx + 1];
  
  const { globalPlans, setGlobalPlans } = usePlan();

  const fetchPlans = async () => {
    if (globalPlans.today) {
      setLoading(false); 
      return;
    }
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

        setGlobalPlans({ 
          today: mapDay(todayName), 
          tomorrow: mapDay(tomorrowName) 
        });
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [])
  );

  // --- LOGOUT HANDLER ---
  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { 
            text: "Log Out", 
            style: "destructive", 
            onPress: async () => {
                setLoggingOut(true); // 1. Start Spinning
                const { error } = await supabase.auth.signOut();
                // 2. Auth listener in _layout.tsx should handle redirect now
                if (error) {
                    setLoggingOut(false);
                    Alert.alert("Error", error.message);
                }
            }
        }
    ]);
  };

  const MealRow = ({ label, dish }: { label: string; dish: any }) => {
    const isPlanned = !!dish;

    return (
      <List.Item
        title={isPlanned ? dish.name : "Tap to plan"}
        titleStyle={{ 
          fontWeight: '700', 
          fontSize: 16, 
          color: isPlanned ? theme.colors.onSurface : theme.colors.outline 
        }}
        description={label.toUpperCase()}
        descriptionStyle={{ 
          fontSize: 11, 
          fontWeight: '700', 
          color: theme.colors.primary, 
          letterSpacing: 1 
        }}
        onPress={() => isPlanned 
          ? router.push({ pathname: '/dish/[id]', params: { id: dish.id } }) 
          : router.push('/(tabs)/planner')
        }
        rippleColor={theme.colors.primaryContainer}
        right={() => (
          <View style={{ justifyContent: 'center', marginLeft: 10 }}>
            {dish?.image_path ? (
              <Image 
                source={{ uri: dish.image_path }} 
                style={{ width: 56, height: 56, borderRadius: theme.roundness }} 
              />
            ) : (
              <View style={{ 
                width: 56, height: 56, 
                borderRadius: theme.roundness, 
                borderWidth: 1, 
                borderColor: theme.colors.outlineVariant, 
                borderStyle: 'dashed',
                backgroundColor: theme.colors.surfaceVariant,
                justifyContent: 'center', alignItems: 'center'
              }}>
                <Text style={{ fontSize: 20, opacity: 0.3 }}>+</Text>
              </View>
            )}
          </View>
        )}
      />
    );
  };

  if (loading && !globalPlans.today) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
        <Text style={{ marginTop: 15, color: theme.colors.secondary }}>Fetching your menu...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* HEADER */}
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content 
          title="My Kitchen" 
          titleStyle={{ fontWeight: '800', fontSize: 22, color: theme.colors.onSurface }} 
        />
        <Appbar.Action icon="cart-outline" onPress={() => router.push('/shop')} iconColor={theme.colors.onSurfaceVariant} />
        <Appbar.Action icon="calendar-outline" onPress={() => router.push('/(tabs)/planner')} iconColor={theme.colors.onSurfaceVariant} />
        
        {/* --- LOGOUT BUTTON OR SPINNER --- */}
        {loggingOut ? (
            <View style={{ width: 48, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.error} />
            </View>
        ) : (
            <Appbar.Action 
                icon="logout" 
                onPress={handleLogout} 
                iconColor={theme.colors.error} 
            />
        )}
        
      </Appbar.Header>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPlans} colors={[theme.colors.primary]} />}
      >
        {/* TODAY SECTION */}
        <Text style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}>TODAY</Text>
        <Card mode="elevated" style={{ backgroundColor: theme.colors.surface, marginBottom: 20 }}>
          <Card.Content style={{ padding: 0 }}> 
            <MealRow label="Breakfast" dish={globalPlans.today?.breakfast} />
            <Divider />
            <MealRow label="Lunch" dish={globalPlans.today?.lunch} />
            <Divider />
            <MealRow label="Dinner" dish={globalPlans.today?.dinner} />
          </Card.Content>
        </Card>

        {/* TOMORROW SECTION */}
        <Text style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}>TOMORROW</Text>
        <Card mode="elevated" style={{ backgroundColor: theme.colors.surface }}>
          <Card.Content style={{ padding: 0 }}>
            <MealRow label="Breakfast" dish={globalPlans.tomorrow?.breakfast} />
            <Divider />
            <MealRow label="Lunch" dish={globalPlans.tomorrow?.lunch} />
            <Divider />
            <MealRow label="Dinner" dish={globalPlans.tomorrow?.dinner} />
          </Card.Content>
        </Card>

        <View style={{ height: 40 }} /> 
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionHeader: { 
    fontSize: 12, 
    fontWeight: '700', 
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.7
  },
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
});