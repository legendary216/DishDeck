import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, NativeSyntheticEvent, NativeScrollEvent, ScrollView } from 'react-native';
import { Text, Card, FAB, Chip, ActivityIndicator, IconButton, Portal, Modal, TouchableRipple, Button } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlan } from '../../context/PlanContext';

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


  // Move/Swap State
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [sourceDay, setSourceDay] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const flatListRef = useRef<FlatList>(null);
 const { globalPlans, setGlobalPlans } = usePlan();

  const updateGlobalState = (allPlans: any) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });

    setGlobalPlans({
        today: {
            breakfast: allPlans['Breakfast']?.[today],
            lunch: allPlans['Lunch']?.[today],
            dinner: allPlans['Dinner']?.[today],
        },
        tomorrow: {
            breakfast: allPlans['Breakfast']?.[tomorrow],
            lunch: allPlans['Lunch']?.[tomorrow],
            dinner: allPlans['Dinner']?.[tomorrow],
        }
    });
};

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

  // 1. Get the candidates (the "deck")
  const { data: candidates } = await supabase
    .from('dishes')
    .select('id, name, image_path') // Get name/image too so we can update Global State
    .eq('user_id', user.id)
    .ilike('type', `%${currentType}%`);

  if (!candidates || candidates.length === 0) {
    Alert.alert("Empty Deck", `No dishes found for ${currentType}!`);
    setIsShuffling(false);
    return;
  }

  // 2. Generate the new selection
  const newRows = DAYS.map(day => ({
    user_id: user.id,
    day: day,
    meal_type: currentType,
    dish_id: candidates[Math.floor(Math.random() * candidates.length)].id
  }));

  // 3. OPTIMISTIC UPDATE: Update Global State immediately
  // We find the today/tomorrow items from our new selection to update the Dashboard
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowName = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });

  const todaySelection = candidates.find(c => c.id === newRows.find(r => r.day === todayName)?.dish_id);
  const tomorrowSelection = candidates.find(c => c.id === newRows.find(r => r.day === tomorrowName)?.dish_id);

  // We merge the new shuffled meal with the existing global state
  setGlobalPlans({
    today: {
      ...globalPlans.today,
      [currentType.toLowerCase()]: todaySelection
    },
    tomorrow: {
      ...globalPlans.tomorrow,
      [currentType.toLowerCase()]: tomorrowSelection
    }
  });

  // 4. DATABASE UPDATE (Background)
  // We don't 'await' the fetchFromSupabase anymore for the UI to feel fast
  try {
    await supabase.from('weekly_plan').upsert(newRows, { onConflict: 'user_id, day, meal_type' });
    await fetchFromSupabase(); // Keeps the Planner tab synced
  } catch (error) {
    console.error("Background sync failed:", error);
    // Optional: Alert user if the save failed
  }

  setIsShuffling(false);
};
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFromSupabase();
    setRefreshing(false);
  };

  const openMoveModal = (day: string) => {
    setSourceDay(day);
    setMoveModalVisible(true);
  };

  const executeMove = async (targetDay: string) => {
    if (!sourceDay) return;
    if (sourceDay === targetDay) {
        setMoveModalVisible(false);
        return;
    }

    setIsMoving(true); 
    const currentType = MEAL_TYPES[activeIndex];
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const sourceDish = plans[currentType]?.[sourceDay];
        const targetDish = plans[currentType]?.[targetDay];

        const updates = [];

        if (sourceDish) {
            updates.push({
                user_id: user.id,
                day: targetDay,
                meal_type: currentType,
                dish_id: sourceDish.id
            });
        }

        if (targetDish) {
            updates.push({
                user_id: user.id,
                day: sourceDay,
                meal_type: currentType,
                dish_id: targetDish.id
            });
        } else {
            // Explicit delete if target was empty
            await supabase.from('weekly_plan').delete().match({
                user_id: user.id,
                day: sourceDay,
                meal_type: currentType
            });
        }

        if (updates.length > 0) {
            await supabase.from('weekly_plan').upsert(updates, { onConflict: 'user_id, day, meal_type' });
        }

        await fetchFromSupabase();
        
        const msg = targetDish 
            ? `Swapped ${sourceDay} and ${targetDay}!` 
            : `Moved to ${targetDay}!`;
        Alert.alert("Success", msg);
    }

    setIsMoving(false); 
    setMoveModalVisible(false);
    setSourceDay(null);
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
            // LONG PRESS RESTORED
            onLongPress={() => openMoveModal(day)}
            delayLongPress={200}
            onPress={() => router.push({ pathname: '/dish/[id]', params: { id: dish.id } })}
          >
            <View style={styles.cardContent}>
              <Card.Cover source={{ uri: dish.image_path || 'https://via.placeholder.com/100' }} style={styles.miniImage} />
              <View style={styles.textContainer}>
                <Text variant="bodyLarge" style={{fontWeight:'bold'}}>{dish.name}</Text>
                {/* Visual Hint */}
                <Text style={{fontSize: 10, color: '#aaa'}}>Hold to move</Text>
              </View>
              
              {/* Only Edit Icon (No Move Icon) */}
              <IconButton 
                icon="pencil" 
                size={20} 
                iconColor="#6200ee"
                onPress={() => openPicker(day, currentType)} 
              />
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

      {/* --- MOVE MODAL WITH SPINNER --- */}
      <Portal>
        <Modal visible={moveModalVisible} onDismiss={() => setMoveModalVisible(false)} contentContainerStyle={styles.modal}>
          
          {isMoving ? (
            <View style={{padding: 20, alignItems: 'center'}}>
                <ActivityIndicator animating={true} size="large" color="#6200ee" />
                <Text style={{marginTop: 10, color: '#666'}}>Moving dish...</Text>
            </View>
          ) : (
            <>
                <Text variant="titleLarge" style={{marginBottom: 15, textAlign:'center'}}>
                    Move {sourceDay}'s Meal To...
                </Text>
                <ScrollView style={{maxHeight: 300}} showsVerticalScrollIndicator={false}>
                    {DAYS.map(day => (
                        <TouchableRipple 
                            key={day} 
                            onPress={() => executeMove(day)}
                            disabled={day === sourceDay}
                            style={[
                                styles.modalOption, 
                                day === sourceDay && {backgroundColor: '#eee', opacity: 0.5} 
                            ]}
                        >
                            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                                <Text variant="bodyLarge" style={{fontWeight: day === sourceDay ? 'bold' : 'normal'}}>
                                    {day}
                                </Text>
                                {plans[MEAL_TYPES[activeIndex]]?.[day] && day !== sourceDay && (
                                    <Text style={{fontSize: 10, color:'orange'}}>Swap ⇄</Text>
                                )}
                            </View>
                        </TouchableRipple>
                    ))}
                </ScrollView>
                <Button onPress={() => setMoveModalVisible(false)} style={{marginTop: 10}}>Cancel</Button>
            </>
          )}

        </Modal>
      </Portal>

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
  
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10 },
  modalOption: { paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
});