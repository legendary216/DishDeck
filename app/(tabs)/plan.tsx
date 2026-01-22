import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Text, Card, FAB, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const SCREEN_WIDTH = Dimensions.get('window').width;

const CACHE_KEY = 'WEEKLY_PLAN_CACHE';

export default function PlanScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [plans, setPlans] = useState<any>({ Breakfast: {}, Lunch: {}, Dinner: {} });
  
  const [loading, setLoading] = useState(true); 
  const [isShuffling, setIsShuffling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      loadCacheAndFetch();
    }, [])
  );

  const loadCacheAndFetch = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setPlans(JSON.parse(cachedData));
        setLoading(false); 
      }
    } catch (e) { console.log(e); }

    await fetchFromSupabase();
  };

  const fetchFromSupabase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('weekly_plan')
      .select('day, meal_type, dishes(*)') 
      .eq('user_id', user.id);

    if (data) {
      const newPlans: any = { Breakfast: {}, Lunch: {}, Dinner: {} };
      data.forEach((item: any) => {
        if (item.dishes && item.meal_type) {
          newPlans[item.meal_type][item.day] = item.dishes;
        }
      });
      setPlans(newPlans);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newPlans));
    }
    setLoading(false);
  };

  const handleShuffle = async () => {
    const currentType = MEAL_TYPES[activeIndex];
    setIsShuffling(true); 
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: candidates } = await supabase
      .from('dishes')
      .select('id')
      .eq('user_id', user.id)
      .ilike('type', `%${currentType}%`);

    if (!candidates || candidates.length === 0) {
      Alert.alert("Empty Deck", `No dishes found for ${currentType}!`);
      setIsShuffling(false);
      return;
    }

    const newRows = DAYS.map(day => ({
      user_id: user.id,
      day: day,
      meal_type: currentType,
      dish_id: candidates[Math.floor(Math.random() * candidates.length)].id
    }));

    await supabase.from('weekly_plan').upsert(newRows, { onConflict: 'user_id, day, meal_type' });
    await fetchFromSupabase();
    
    setIsShuffling(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFromSupabase();
    setRefreshing(false);
  };

  const scrollToIndex = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < MEAL_TYPES.length) {
      setActiveIndex(index);
    }
  };

  const openPicker = (day: string, type: string) => {
    router.push({ pathname: '/pick-dish', params: { day, mealType: type } });
  };

  const renderDayRow = (day: string, currentType: string) => {
    const dish = plans[currentType]?.[day];
    const isToday = day === todayName;

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

  const shouldShowSpinner = isShuffling || (loading && Object.keys(plans.Lunch).length === 0);

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

      <View style={{ flex: 1 }}>
        {/* LOGIC FIX: The List is always present (so it keeps its scroll position),
            but we turn its Opacity to 0 when loading. This makes it invisible but
            keeps the layout intact.
        */}
        <View style={{ flex: 1, opacity: shouldShowSpinner ? 0 : 1 }}>
            <FlatList
                ref={flatListRef}
                data={MEAL_TYPES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyExtractor={(item) => item}
                getItemLayout={(data, index) => (
                    {length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index}
                )}
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
        </View>

        {/* SPINNER: Absolute Center. Only visible when loading. */}
        {shouldShowSpinner && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator animating={true} size="large" color="#6200ee" />
            </View>
        )}
      </View>

      <FAB
        icon="shuffle"
        label="Shuffle"
        style={styles.fab}
        onPress={handleShuffle}
        disabled={isShuffling} 
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
  todayRow: { backgroundColor: '#eaddff' },
  dayLabel: { width: 50, fontWeight: 'bold', fontSize: 16, color: '#555' },
  card: { flex: 1, marginLeft: 10 },
  emptyCard: { flex: 1, marginLeft: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', elevation: 0 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  emptyContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', padding: 10 },
  miniImage: { width: 50, height: 50, borderRadius: 8 },
  textContainer: { marginLeft: 10, flex: 1 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#6200ee' },
});