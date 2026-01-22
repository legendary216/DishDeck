import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Searchbar } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../utils/supabase';

export default function PickDishScreen() {
  const { day, mealType } = useLocalSearchParams();
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch dishes that match the meal type (e.g. "Lunch")
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('user_id', user.id)
      .ilike('type', `%${mealType}%`)
      .order('name');

    if (error) Alert.alert("Error", error.message);
    else setDishes(data || []);
    setLoading(false);
  };

  const handleSelect = async (dishId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save the specific choice to the Weekly Plan
    const { error } = await supabase.from('weekly_plan').upsert({
      user_id: user.id,
      day: day,
      meal_type: mealType,
      dish_id: dishId
    }, { onConflict: 'user_id, day, meal_type' });

    if (error) {
      Alert.alert("Error", "Could not save selection.");
    } else {
      router.back(); // Go back to Plan screen automatically
    }
  };

  const filteredDishes = dishes.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.header}>
        Pick {mealType} for {day}
      </Text>
      
      <Searchbar
        placeholder="Search dishes..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.search}
      />

      {loading ? (
        <ActivityIndicator size="large" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredDishes}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 50 }}
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20}}>No {mealType} dishes found.</Text>}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => handleSelect(item.id)}>
              <View style={styles.row}>
                <Card.Cover source={{ uri: item.image_path || 'https://via.placeholder.com/100' }} style={styles.tinyImg} />
                <Text style={styles.name}>{item.name}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 15 },
  header: { textAlign: 'center', marginBottom: 15, fontWeight: 'bold', marginTop: 10 },
  search: { marginBottom: 15, backgroundColor: '#f0f0f0' },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  tinyImg: { width: 50, height: 50, borderRadius: 8, marginRight: 15 },
  name: { fontWeight: 'bold', fontSize: 16 }
});