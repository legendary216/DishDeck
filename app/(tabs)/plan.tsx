import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert } from 'react-native';
import { Text, Card, FAB, Chip, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { useFocusEffect, router } from 'expo-router';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function PlanScreen() {
  const [activeIndex, setActiveIndex] = useState(1); // Start at Lunch
  const [plans, setPlans] = useState<any>({ Breakfast: {}, Lunch: {}, Dinner: {} });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // <--- New State for Pull-to-Refresh
  
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      fetchAllPlans();
    }, [])
  );

  const fetchAllPlans = async () => {
    // Only show full loading spinner if NOT refreshing (otherwise the pull-down spinner handles it)
    if (!refreshing) setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('weekly_plan')
      .select('day, meal_type, dishes(*)') 
      .eq('user_id', user.id);

    if (error) {
      console.error(error);
    } else {
      const newPlans: any = { Breakfast: {}, Lunch: {}, Dinner: {} };
      data.forEach((item: any) => {
        if (item.dishes && item.meal_type) {
          newPlans[item.meal_type][item.day] = item.dishes;
        }
      });
      setPlans(newPlans);
    }
    setLoading(false);
  };

  // Wrapper for Pull-to-Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllPlans();
    setRefreshing(false);
  };

  const handleShuffle = async () => {
    const currentType = MEAL_TYPES[activeIndex];
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Find candidates
    const { data: candidates } = await supabase
      .from('dishes')
      .select('id')
      .eq('user_id', user.id)
      .ilike('type', `%${currentType}%`);

    if (!candidates || candidates.length === 0) {
      Alert.alert("Empty Deck", `No dishes found for ${currentType}!`);
      setLoading(false);
      return;
    }

    // 2. Shuffle Logic
    const newRows = DAYS.map(day => ({
      user_id: user.id,
      day: day,
      meal_type: currentType,
      dish_id: candidates[Math.floor(Math.random() * candidates.length)].id
    }));

    // 3. Save
    await supabase.from('weekly_plan').upsert(newRows, { onConflict: 'user_id, day, meal_type' });
    
    // 4. Refresh UI
    await fetchAllPlans();
  };

  const onMomentumScrollEnd = (e: any) => {
    const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(pageIndex);
  };

  const scrollToIndex = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const renderDayRow = (day: string, currentType: string) => {
    const dish = plans[currentType]?.[day];
    return (
      <View style={styles.dayRow} key={day}>
        <Text style={styles.dayLabel}>{day.substring(0, 3)}</Text>
        {dish ? (
          <Card 
            style={styles.card} 
            onPress={() => router.push({ pathname: '/dish/[id]', params: { id: dish.id } })}
          >
            <View style={styles.cardContent}>
              <Card.Cover source={{ uri: dish.image_path || 'https://via.placeholder.com/100' }} style={styles.miniImage} />
              <View style={styles.textContainer}>
                <Text variant="bodyLarge" style={{fontWeight:'bold'}}>{dish.name}</Text>
                <Text variant="bodySmall" style={{color:'gray'}}>{currentType}</Text>
              </View>
            </View>
          </Card>
        ) : (
          <View style={styles.emptySlot}>
            <Text style={{color: '#aaa'}}>Nothing planned</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.header}>Weekly Plan</Text>

      {/* TOP TABS */}
      <View style={styles.chipsRow}>
        {MEAL_TYPES.map((type, index) => (
          <Chip
            key={type}
            selected={activeIndex === index}
            onPress={() => scrollToIndex(index)}
            showSelectedOverlay
            style={styles.chip}
          >
            {type}
          </Chip>
        ))}
      </View>

      {/* Main loading spinner (only for initial load/shuffle, not refresh) */}
      {loading && !refreshing && (
        <ActivityIndicator animating={true} style={{position:'absolute', top: 150, zIndex: 10, alignSelf:'center'}} />
      )}

      {/* HORIZONTAL SWIPE CONTAINER */}
      <FlatList
        ref={flatListRef}
        data={MEAL_TYPES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false} // Hide Horizontal Bar
        onMomentumScrollEnd={onMomentumScrollEnd}
        keyExtractor={(item) => item}
        renderItem={({ item: type }) => (
          <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 15 }}>
             {/* VERTICAL LIST (The Schedule) */}
             <FlatList 
                data={DAYS}
                keyExtractor={day => day}
                scrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false} // <--- Hide Vertical Bar
                
                // --- PULL TO REFRESH ---
                refreshing={refreshing}
                onRefresh={onRefresh}
                // -----------------------

                renderItem={({ item: day }) => renderDayRow(day, type)}
             />
          </View>
        )}
      />

      <FAB
        icon="shuffle"
        label="Shuffle"
        style={styles.fab}
        onPress={handleShuffle}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { marginTop: 40, marginBottom: 15, fontWeight: 'bold', paddingLeft: 15 },
  chipsRow: { flexDirection: 'row', marginBottom: 10, justifyContent: 'center', gap: 10 },
  chip: { marginRight: 5 },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  dayLabel: { width: 50, fontWeight: 'bold', fontSize: 16, color: '#555' },
  card: { flex: 1, marginLeft: 10 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  miniImage: { width: 60, height: 60, borderRadius: 8 },
  textContainer: { marginLeft: 15, flex: 1 },
  emptySlot: { flex: 1, marginLeft: 10, height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#aaa' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#6200ee' },
});