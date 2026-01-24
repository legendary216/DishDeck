import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, NativeSyntheticEvent, NativeScrollEvent, ScrollView } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, IconButton, Portal, Modal, TouchableRipple, Button, SegmentedButtons, useTheme, Avatar } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlan } from '../../context/PlanContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CACHE_KEY = 'WEEKLY_PLAN_CACHE';

export default function PlanScreen() {
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);
  
  // State
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
  const { setGlobalPlans } = usePlan();

  // --- DATA FETCHING ---
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

    const { data } = await supabase
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
      updateGlobalContext(newPlans);
    }
    setLoading(false);
  };

  const updateGlobalContext = (currentPlans: any) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIdx = new Date().getDay();
    const tName = days[todayIdx];
    const tomName = days[(todayIdx + 1) % 7];

    setGlobalPlans({
        today: {
            breakfast: currentPlans['Breakfast']?.[tName],
            lunch: currentPlans['Lunch']?.[tName],
            dinner: currentPlans['Dinner']?.[tName],
        },
        tomorrow: {
            breakfast: currentPlans['Breakfast']?.[tomName],
            lunch: currentPlans['Lunch']?.[tomName],
            dinner: currentPlans['Dinner']?.[tomName],
        }
    });
  };

  // --- ACTIONS ---
  const handleShuffle = async () => {
    const currentType = MEAL_TYPES[activeIndex];
    setIsShuffling(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get Candidates
    const { data: candidates } = await supabase
      .from('dishes')
      .select('id, name, image_path')
      .eq('user_id', user.id)
      .ilike('type', `%${currentType}%`);

    if (!candidates || candidates.length === 0) {
      Alert.alert("Empty Deck", `No dishes found for ${currentType}!`);
      setIsShuffling(false);
      return;
    }

    // 2. Generate New Rows
    const newRows = DAYS.map(day => ({
      user_id: user.id,
      day: day,
      meal_type: currentType,
      dish_id: candidates[Math.floor(Math.random() * candidates.length)].id
    }));

    // 3. Update DB & UI
    await supabase.from('weekly_plan').upsert(newRows, { onConflict: 'user_id, day, meal_type' });
    await fetchFromSupabase();
    setIsShuffling(false);
  };

  const executeMove = async (targetDay: string) => {
    if (!sourceDay) return;
    setIsMoving(true);
    const currentType = MEAL_TYPES[activeIndex];
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const sourceDish = plans[currentType]?.[sourceDay];
        const targetDish = plans[currentType]?.[targetDay];
        
        const updates = [];
        if (sourceDish) updates.push({ user_id: user.id, day: targetDay, meal_type: currentType, dish_id: sourceDish.id });
        if (targetDish) updates.push({ user_id: user.id, day: sourceDay, meal_type: currentType, dish_id: targetDish.id });
        else {
             await supabase.from('weekly_plan').delete().match({ user_id: user.id, day: sourceDay, meal_type: currentType });
        }
        
        if (updates.length > 0) {
            await supabase.from('weekly_plan').upsert(updates, { onConflict: 'user_id, day, meal_type' });
        }
        await fetchFromSupabase();
    }
    setIsMoving(false);
    setMoveModalVisible(false);
    setSourceDay(null);
  };

  const openPicker = (day: string, type: string) => {
    router.push({ pathname: '/pick-dish', params: { day, mealType: type } });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < MEAL_TYPES.length) {
      setActiveIndex(index);
    }
  };

  const handleSegmentChange = (value: string) => {
    const index = MEAL_TYPES.indexOf(value);
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  // --- RENDER ROW ---
 const renderDayRow = (day: string, currentType: string) => {
    const dish = plans[currentType]?.[day];
    const isToday = day === todayName;

    return (
      <View style={styles.dayRow} key={day}>
        <Text style={[
            styles.dayLabel, 
            { color: isToday ? theme.colors.primary : theme.colors.onSurfaceVariant }
        ]}>
          {day.substring(0, 3)}
        </Text>
        
        {dish ? (
          // --- FILLED CARD ---
          <Card 
            mode="contained"
            style={[
                styles.card, 
                { 
                    backgroundColor: isToday ? theme.colors.secondaryContainer : theme.colors.surface,
                    borderRadius: 24,
                    // Solid border for inactive days, No border for active day
                    borderWidth: isToday ? 0 : 1,
                    borderColor: isToday ? 'transparent' : 'rgba(0,0,0,0.1)', 
                }
            ]}
            onLongPress={() => { setSourceDay(day); setMoveModalVisible(true); }}
            delayLongPress={200}
            onPress={() => router.push({ pathname: '/dish/[id]', params: { id: dish.id } })}
          >
            <Card.Content style={styles.cardContent}>
              <Avatar.Image size={40} source={{ uri: dish.image_path }} />
              <View style={styles.textContainer}>
                <Text 
                    variant="bodyMedium" 
                    style={{ 
                        fontWeight: '700', 
                        color: isToday ? theme.colors.onSecondaryContainer : theme.colors.onSurface 
                    }}
                >
                    {dish.name}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                    Hold to swap
                </Text>
              </View>
              <IconButton 
                icon="pencil" 
                size={20} 
                iconColor={isToday ? theme.colors.primary : theme.colors.primary}
                onPress={() => openPicker(day, currentType)} 
              />
            </Card.Content>
          </Card>
        ) : (
          // --- EMPTY CARD (Updated) ---
          <Card 
            mode="outlined" 
            style={[
                styles.emptyCard, 
                { 
                    // FIX: Match the styling of filled cards exactly
                    borderColor: 'rgba(0,0,0,0.1)', 
                    borderRadius: 24,
                    borderStyle: 'solid', // CHANGED FROM 'dashed' TO 'solid'
                    borderWidth: 1,
                }
            ]} 
            onPress={() => openPicker(day, currentType)}
          >
             <View style={styles.emptyContent}>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Add Dish</Text>
                <IconButton icon="plus" size={18} iconColor={theme.colors.outline} />
             </View>
          </Card>
        )}
      </View>
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* 1. Header */}
      <View style={styles.headerContainer}>
        <Text variant="headlineMedium" style={{ fontWeight: '800', color: theme.colors.onSurface }}>
            Weekly Plan
        </Text>
      </View>

      {/* 2. Toggle */}
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={MEAL_TYPES[activeIndex]}
          onValueChange={handleSegmentChange}
          buttons={[
            { value: 'Breakfast', label: 'Breakfast' },
            { value: 'Lunch', label: 'Lunch' },
            { value: 'Dinner', label: 'Dinner' },
          ]}
          density="medium"
        />
      </View>

      {/* 3. Horizontal Pager */}
      <View style={{ flex: 1 }}>
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
                <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 16 }}>
                    <FlatList 
                        data={DAYS}
                        keyExtractor={day => day}
                        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={fetchFromSupabase}
                        renderItem={({ item: day }) => renderDayRow(day, type)}
                    />
                </View>
            )}
          />
          
          {(isShuffling || loading) && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
            </View>
          )}
      </View>

      {/* 4. FAB (Standard V5 usage) */}
      <FAB
        icon="shuffle-variant"
        label="Shuffle Week"
        onPress={handleShuffle}
        visible={!isShuffling}
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        color={theme.colors.onPrimaryContainer}
        mode="elevated"
      />

      {/* 5. Move Modal */}
      <Portal>
        <Modal visible={moveModalVisible} onDismiss={() => setMoveModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          {isMoving ? (
            <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
          ) : (
            <>
                <Text variant="titleMedium" style={{ marginBottom: 15, textAlign: 'center', fontWeight: 'bold', color: theme.colors.onSurface }}>
                   Move {sourceDay}'s {MEAL_TYPES[activeIndex]} to...
                </Text>
                <ScrollView style={{ maxHeight: 300 }}>
                    {DAYS.map(day => (
                        <TouchableRipple 
                            key={day} 
                            onPress={() => executeMove(day)}
                            disabled={day === sourceDay}
                            style={[styles.modalOption, { borderBottomColor: theme.colors.surfaceVariant }]}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: day === sourceDay ? theme.colors.outline : theme.colors.onSurface }}>
                                    {day}
                                </Text>
                                {plans[MEAL_TYPES[activeIndex]]?.[day] && day !== sourceDay && (
                                    <Text variant="labelSmall" style={{ color: theme.colors.tertiary }}>Swap ⇄</Text>
                                )}
                            </View>
                        </TouchableRipple>
                    ))}
                </ScrollView>
                <Button mode="text" onPress={() => setMoveModalVisible(false)} style={{ marginTop: 10 }}>Cancel</Button>
            </>
          )}
        </Modal>
      </Portal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, marginTop: 50, marginBottom: 10 },
  segmentContainer: { paddingHorizontal: 16, marginBottom: 5 },
  
  dayRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12, 
    // No background here to prevent "Rectangular Box" glitch
  },
  dayLabel: { 
    width: 45, 
    fontWeight: '700', 
    fontSize: 14,
    textAlign: 'center' 
  },
  
  card: { flex: 1, marginLeft: 8, justifyContent: 'center' },
  cardContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  textContainer: { marginLeft: 12, flex: 1 },
  
  emptyCard: { 
    flex: 1, 
    marginLeft: 8, 
    borderStyle: 'dashed', 
    borderWidth: 1, 
    backgroundColor: 'transparent',
    height: 60, // Consistent height
    justifyContent: 'center'
  },
  emptyContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 20 },
  modal: { padding: 20, margin: 20, borderRadius: 24 },
  modalOption: { paddingVertical: 16, borderBottomWidth: 1 },
});