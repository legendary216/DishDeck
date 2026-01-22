import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList } from 'react-native';
import { Text, Card, FAB, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { useFocusEffect, router } from 'expo-router';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PlanScreen() {
  const [selectedType, setSelectedType] = useState('Lunch'); // Default view
  const [plan, setPlan] = useState<any>({}); // Stores the schedule { "Monday": dishData, ... }
  const [loading, setLoading] = useState(false);

  // Load the plan whenever the user switches tabs or changes the Meal Type filter
  useFocusEffect(
    useCallback(() => {
      fetchPlan();
    }, [selectedType])
  );

  const fetchPlan = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get the plan from DB for this specific Meal Type (e.g., just Lunches)
    const { data, error } = await supabase
      .from('weekly_plan')
      .select('day, dishes(*)') // Join with dishes table to get names/images
      .eq('user_id', user.id)
      .eq('meal_type', selectedType);

    if (error) {
      console.error(error);
    } else {
      // Convert Array to Object for easier lookup: { "Monday": dish, "Tuesday": dish }
      const planMap: any = {};
      data.forEach((item: any) => {
        if (item.dishes) planMap[item.day] = item.dishes;
      });
      setPlan(planMap);
    }
    setLoading(false);
  };

  const handleShuffle = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch Candidates: Get all dishes that match the current type (e.g. "Lunch")
    // We use .ilike to find if the type is INSIDE the list (e.g. "Breakfast, Lunch")
    const { data: candidates, error } = await supabase
      .from('dishes')
      .select('id')
      .eq('user_id', user.id)
      .ilike('type', `%${selectedType}%`);

    if (error || !candidates || candidates.length === 0) {
      Alert.alert("Empty Deck", `You don't have any dishes tagged as ${selectedType} yet!`);
      setLoading(false);
      return;
    }

    // 2. The Shuffle Algorithm
    const newPlanRows = [];
    
    for (const day of DAYS) {
      // Pick a random dish from candidates
      const randomDish = candidates[Math.floor(Math.random() * candidates.length)];
      
      newPlanRows.push({
        user_id: user.id,
        day: day,
        meal_type: selectedType,
        dish_id: randomDish.id
      });
    }

    // 3. Save to Database (Upsert = Insert or Update if exists)
    const { error: saveError } = await supabase
      .from('weekly_plan')
      .upsert(newPlanRows, { onConflict: 'user_id, day, meal_type' });

    if (saveError) {
      Alert.alert("Error", "Could not save the shuffle.");
    } else {
      fetchPlan(); // Reload UI
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.header}>Weekly Plan</Text>

      {/* Filter Chips */}
      <View style={styles.chipsRow}>
        {['Breakfast', 'Lunch', 'Dinner'].map((type) => (
          <Chip
            key={type}
            selected={selectedType === type}
            onPress={() => setSelectedType(type)}
            showSelectedOverlay
            style={styles.chip}
          >
            {type}
          </Chip>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator animating={true} size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={DAYS}
          keyExtractor={(day) => day}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item: day }) => {
            const dish = plan[day];
            return (
              <View style={styles.dayRow}>
                {/* 1. Day Label (Mon, Tue) */}
                <Text style={styles.dayLabel}>{day.substring(0, 3)}</Text>
                
                {/* 2. The Card or Empty Slot */}
                {dish ? (
                  <Card 
                    style={styles.card} 
                    onPress={() => router.push({ pathname: '/dish/[id]', params: { id: dish.id } })}
                  >
                    <View style={styles.cardContent}>
                      <Card.Cover 
                        source={{ uri: dish.image_path || 'https://via.placeholder.com/100' }} 
                        style={styles.miniImage} 
                      />
                      <View style={styles.textContainer}>
                        <Text variant="bodyLarge" style={{fontWeight:'bold'}}>
                          {dish.name}
                        </Text>
                        <Text variant="bodySmall" style={{color:'gray'}}>
                          {selectedType}
                        </Text>
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
          }}
        />
      )}

      {/* The Magic Button */}
      <FAB
        icon="shuffle"
        label="Shuffle Week"
        style={styles.fab}
        onPress={handleShuffle}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  header: { marginTop: 40, marginBottom: 15, fontWeight: 'bold' },
  chipsRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
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