import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Image, Alert ,TouchableOpacity,Vibration} from 'react-native';
import { Text, Appbar, ActivityIndicator, Surface, useTheme, Avatar, Divider, TouchableRipple, IconButton } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';
import { usePlan } from '../../context/PlanContext';
import { useAppTheme } from '../../utils/ThemeContext';

export default function DashboardScreen() {
  const { cycleTheme } = useAppTheme(); // <--- Use Hook
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayDate = new Date();
  const todayIdx = todayDate.getDay();
  
  const todayName = days[todayIdx];
  const tomorrowName = days[todayIdx + 1];
  const dateString = todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const { globalPlans, setGlobalPlans } = usePlan();

  const fetchPlans = async () => {
    // Logic Preserved: Check Context -> Fetch DB -> Update Context
    if (globalPlans.today && globalPlans.tomorrow) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('weekly_plan')
        .select(`day, meal_type, dish:dishes(id, name, image_path, type)`)
        .eq('user_id', user.id)
        .in('day', [todayName, tomorrowName]);

      if (data) {
        const mapDay = (dName: string) => ({
          breakfast: data.find(m => m.day === dName && m.meal_type === 'Breakfast')?.dish,
          lunch: data.find(m => m.day === dName && m.meal_type === 'Lunch')?.dish,
          dinner: data.find(m => m.day === dName && m.meal_type === 'Dinner')?.dish,
        });
        setGlobalPlans({ today: mapDay(todayName), tomorrow: mapDay(tomorrowName) });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchPlans(); }, []));

  const handleLogout = async () => {
    Alert.alert("Log Out", "See you later?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => {
          setLoggingOut(true);
          await supabase.auth.signOut();
      }}
    ]);
  };

  const handleTitlePress = () => {
      cycleTheme();
      Vibration.vibrate(10); // Haptic feedback
  };

  // --- WIDGET: Meal Row (The Building Block) ---
  const MealRow = ({ label, dish, icon, isToday }: { label: string; dish: any; icon: string, isToday?: boolean }) => {
    const isPlanned = !!dish;

    
    
    return (
      <TouchableRipple 
        onPress={() => isPlanned 
          ? router.push({ pathname: '/dish/[id]', params: { id: dish.id } }) 
          : router.push('/(tabs)/planner')
        }
        rippleColor={theme.colors.primaryContainer}
      >
        <View style={styles.rowContent}>
            
            {/* 1. Icon (Visual Anchor) */}
            <View style={[styles.iconBox, { backgroundColor: isPlanned ? theme.colors.secondaryContainer : theme.colors.surfaceVariant }]}>
                <Avatar.Icon size={20} icon={icon} color={isPlanned ? theme.colors.onSecondaryContainer : theme.colors.outline} style={{ backgroundColor: 'transparent' }} />
            </View>

            {/* 2. Text Info (The Data) */}
            <View style={styles.textColumn}>
                <Text style={[styles.label, { color: theme.colors.outline }]}>{label.toUpperCase()}</Text>
                
                {isPlanned ? (
                    <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: isToday ? '700' : '500', color: theme.colors.onSurface }}>
                        {dish.name}
                    </Text>
                ) : (
                    // Actionable Empty State
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600', opacity: 0.8 }}>
                        + Add Meal
                    </Text>
                )}
            </View>

            {/* 3. Right Side (Thumb or Arrow) */}
            {isPlanned && dish.image_path ? (
                <Image source={{ uri: dish.image_path }} style={styles.dishThumb} />
            ) : null}
            
            {/* Subtle Arrow for Empty States to encourage clicking */}
            {!isPlanned && <IconButton icon="chevron-right" size={18} iconColor={theme.colors.outlineVariant} style={{ margin: 0 }} />}

        </View>
      </TouchableRipple>
    );
  };

  if (loading && !globalPlans.today) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* 1. HEADER (Restored Icons) */}
      <Appbar.Header style={{ backgroundColor: 'transparent', height: 40, elevation: 0 ,marginTop: 10}}>
     <TouchableOpacity 
    onPress={handleTitlePress} 
    activeOpacity={0.6} 
    style={{ flex: 1, justifyContent: 'center' }} 
  >
      <Appbar.Content 
        title="DishDeck" 
        titleStyle={{ fontWeight: '900', color: theme.colors.primary, fontSize: 22, marginLeft : 20 }} 
      />
  </TouchableOpacity>
        <Appbar.Action icon="cart-outline" onPress={() => router.push('/shop')} iconColor={theme.colors.onSurfaceVariant} />
       
        
        {loggingOut ? <ActivityIndicator size="small" style={{ marginRight: 15 }} /> : 
            <Appbar.Action icon="logout" size={22} onPress={handleLogout} iconColor={theme.colors.error} />
        }
      </Appbar.Header>

      <View style={styles.mainLayout}>
        
        {/* === SECTION 1: TODAY (Focused & Elevated) === */}
        <View style={styles.todaySection}>
            <View style={styles.sectionHeader}>
                <View>
                    <Text variant="headlineSmall" style={{ fontWeight: '800', color: theme.colors.onSurface }}>{dateString}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline, fontWeight: '600', letterSpacing: 1 }}>TODAY'S MENU</Text>
                </View>
                {/* Visual Eye Candy */}
                <Avatar.Icon size={40} icon="chef-hat" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
            </View>

            <Surface style={[styles.cardSurface, { backgroundColor: theme.colors.surface }]} elevation={4}>
                <MealRow label="Breakfast" dish={globalPlans.today?.breakfast} icon="weather-sunset-up" isToday />
                <Divider style={{ marginHorizontal: 16 }} />
                <MealRow label="Lunch" dish={globalPlans.today?.lunch} icon="weather-sunny" isToday />
                <Divider style={{ marginHorizontal: 16 }} />
                <MealRow label="Dinner" dish={globalPlans.today?.dinner} icon="weather-night" isToday />
            </Surface>
        </View>

        {/* === SECTION 2: TOMORROW (Subtle & Flat) === */}
        <View style={styles.tomorrowSection}>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingLeft: 5 }}>
                <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
                    Tomorrow
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginLeft: 8 }}>
                    ({tomorrowName})
                </Text>
             </View>
             
             {/* Note: Lower elevation and opacity for hierarchy */}
             <Surface style={[styles.cardSurface, { backgroundColor: theme.colors.surfaceVariant, opacity: 0.85 }]} elevation={0}>
                <MealRow label="Breakfast" dish={globalPlans.tomorrow?.breakfast} icon="weather-sunset-up" />
                <Divider style={{ backgroundColor: theme.colors.outlineVariant, marginHorizontal: 16 }} />
                <MealRow label="Lunch" dish={globalPlans.tomorrow?.lunch} icon="weather-sunny" />
                <Divider style={{ backgroundColor: theme.colors.outlineVariant, marginHorizontal: 16 }} />
                <MealRow label="Dinner" dish={globalPlans.tomorrow?.dinner} icon="weather-night" />
             </Surface>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  mainLayout: { 
    flex: 1, 
    paddingHorizontal: 20, 
    paddingBottom: 15,
    paddingTop: 10
  },

  // Today Section (Takes ~60% space)
  todaySection: {
    flex: 1.3, 
    justifyContent: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  
  // Tomorrow Section (Takes ~40% space)
  tomorrowSection: {
    flex: 1,
    justifyContent: 'flex-start', // Changed from 'center' -> Pushes content UP
    paddingTop: 5,               // Adds a tiny gap after the previous section
    
  },

  // Shared Card Styles
  cardSurface: {
    borderRadius: 24,
    overflow: 'hidden', 
  },
  
  // Row Styles
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 36, height: 36,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dishThumb: {
    width: 42, height: 42,
    borderRadius: 10,
    marginLeft: 10,
  }
});