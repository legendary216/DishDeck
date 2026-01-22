import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert } from 'react-native';
import { Text, Card, FAB, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { useFocusEffect, router } from 'expo-router';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function PlanScreen() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [plans, setPlans] = useState<any>({ Breakfast: {}, Lunch: {}, Dinner: {} });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Get Current Day Name (e.g., "Friday")
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      fetchAllPlans();
    }, [])
  );

  const fetchAllPlans = async () => {
    if (!refreshing) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('weekly_plan')
      .select('day, meal_type, dishes(*)') 
      .eq('user_id', user.id);

    if (error) console.error(error);
    else {
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

    const newRows = DAYS.map(day => ({
      user_id: user.id,
      day: day,
      meal_type: currentType,
      dish_id: candidates[Math.floor(Math.random() * candidates.length)].id
    }));

    await supabase.from('weekly_plan').upsert(newRows, { onConflict: 'user_id, day, meal_type' });
    await fetchAllPlans();
  };

  const scrollToIndex = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const onMomentumScrollEnd = (e: any) => {
    const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(pageIndex);
  };

  // NEW: Navigate to the picker screen
  const openPicker = (day: string, type: string) => {
    router.push({ pathname: '/pick-dish', params: { day, mealType: type } });
  };

  const renderDayRow = (day: string, currentType: string) => {
    const dish = plans[currentType]?.[day];
    const isToday = day === todayName; // Check if this row is today

    return (
      <View style={[styles.dayRow, isToday && styles.todayRow]} key={day}>
        <Text style={[styles.dayLabel, isToday && {color: '#6200ee'}]}>
          {day.substring(0, 3)}
        </Text>
        
        {dish ? (
          <Card 
            style={[styles.card, isToday && {borderColor: '#6200ee', borderWidth: 1}]} 
            onPress={() => router.push({ pathname: '/dish/[id]', params: { id: dish.id } })}
          >
            <View style={styles.cardContent}>
              <Card.Cover source={{ uri: dish.image_path || 'https://via.placeholder.com/100' }} style={styles.miniImage} />
              <View style={styles.textContainer}>
                <Text variant="bodyLarge" style={{fontWeight:'bold'}}>{dish.name}</Text>
              </View>
              {/* Edit Icon */}
              <IconButton icon="pencil" size={20} onPress={() => openPicker(day, currentType)} />
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyCard} onPress={() => openPicker(day, currentType)}>
             <View style={styles.emptyContent}>
                <Text style={{color: '#aaa', marginRight: 10}}>Add Dish</Text>
                <IconButton icon="plus-circle-outline" size={20} iconColor="#aaa" />
             </View>
          </Card>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.header}>Weekly Plan</Text>

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

      {loading && !refreshing && <ActivityIndicator animating={true} style={{position:'absolute', top: 150, zIndex: 10, alignSelf:'center'}} />}

      <FlatList
        ref={flatListRef}
        data={MEAL_TYPES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        keyExtractor={(item) => item}
        renderItem={({ item: type }) => (
          <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 15 }}>
             <FlatList 
                data={DAYS}
                keyExtractor={day => day}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
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
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, padding: 5, borderRadius: 8 },
  todayRow: { backgroundColor: '#eaddff' }, // Light purple highlight for today
  dayLabel: { width: 50, fontWeight: 'bold', fontSize: 16, color: '#555' },
  card: { flex: 1, marginLeft: 10 },
  emptyCard: { flex: 1, marginLeft: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', elevation: 0 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  emptyContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', padding: 10 },
  miniImage: { width: 50, height: 50, borderRadius: 8 },
  textContainer: { marginLeft: 10, flex: 1 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#6200ee' },
});