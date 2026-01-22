import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, FAB, ActivityIndicator, Divider, Chip, Button, Card, IconButton } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

export default function DeckScreen() {
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Suggest State
  const [quickType, setQuickType] = useState('Lunch');
  const [suggestion, setSuggestion] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchDishes();
    }, [])
  );

  const fetchDishes = async () => {
    if (!refreshing) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) Alert.alert("Error", error.message);
      else setDishes(data || []);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDishes();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleQuickSuggest = () => {
    const candidates = dishes.filter(d => 
        d.type && d.type.toLowerCase().includes(quickType.toLowerCase())
    );

    if (candidates.length === 0) {
        Alert.alert("No Options", `You don't have any dishes tagged as ${quickType} yet.`);
        setSuggestion(null);
        return;
    }

    const randomDish = candidates[Math.floor(Math.random() * candidates.length)];
    setSuggestion(randomDish);
  };

  const renderDishRow = ({ item }: { item: any }) => {
    const rawUrl = item.image_path || '';
    const imageUrl = rawUrl.trim().replace(/ /g, '%20') || 'https://via.placeholder.com/150';

    return (
      <TouchableOpacity 
        style={styles.row} 
        onPress={() => router.push({ pathname: '/dish/[id]', params: { id: item.id } })}
      >
        <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.textContainer}>
          <Text variant="titleMedium" style={styles.dishName} numberOfLines={1}>{item.name}</Text>
          <Text variant="bodySmall" style={styles.dishType}>{item.type}</Text>
        </View>
        <Text style={{color: '#ccc', fontSize: 20}}>›</Text>
      </TouchableOpacity>
    );
  };

  // Helper to get image URL for the suggestion card
  const getSuggestionImage = () => {
    if (!suggestion || !suggestion.image_path) return 'https://via.placeholder.com/150';
    return suggestion.image_path.trim().replace(/ /g, '%20');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>My Kitchen</Text>
        <TouchableOpacity onPress={handleLogout}>
            <Text style={{color: 'red', fontWeight: 'bold'}}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* --- QUICK SUGGEST SECTION --- */}
      <View style={styles.suggestContainer}>
        <Text variant="titleMedium" style={{marginBottom: 10, fontWeight:'bold', color:'#444'}}>
            Quick Decide 🎲
        </Text>
        
        <View style={styles.chipRow}>
            {MEAL_TYPES.map(type => (
                <Chip 
                    key={type} 
                    selected={quickType === type} 
                    onPress={() => setQuickType(type)}
                    style={styles.chip}
                    showSelectedOverlay
                >
                    {type}
                </Chip>
            ))}
        </View>

        {!suggestion ? (
            <Button mode="contained" onPress={handleQuickSuggest} style={styles.suggestBtn}>
                Pick for Me
            </Button>
        ) : (
            <Card style={styles.resultCard} onPress={() => router.push({ pathname: '/dish/[id]', params: { id: suggestion.id } })}>
                <View style={styles.resultContent}>
                    {/* NEW: Show Image Here */}
                    <Image 
                        source={{ uri: getSuggestionImage() }} 
                        style={styles.resultImage} 
                    />
                    
                    <View style={{flex: 1, marginLeft: 15}}>
                        <Text style={{color:'#6200ee', fontWeight:'bold', marginBottom: 2, fontSize: 12}}>
                            How about...
                        </Text>
                        <Text variant="titleMedium" style={{fontWeight:'bold'}} numberOfLines={2}>
                            {suggestion.name}
                        </Text>
                    </View>
                    
                    <IconButton icon="refresh" iconColor="#6200ee" onPress={handleQuickSuggest} />
                </View>
            </Card>
        )}
      </View>
      
      <View style={{height: 10, backgroundColor: '#f5f5f5'}} />

      {/* --- MAIN LIST --- */}
      {loading && !refreshing && <ActivityIndicator animating={true} size="large" style={{marginTop: 50}} />}

      <FlatList
        data={dishes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
                <Text style={{fontSize: 50, marginBottom: 10}}>🍲</Text>
                <Text style={{color: 'gray'}}>No dishes yet.</Text>
            </View>
          ) : null
        }
        renderItem={renderDishRow}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/add-dish')}
        color="white"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, marginTop: 50, marginBottom: 15 
  },
  title: { fontWeight: 'bold' },

  suggestContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  chip: { backgroundColor: '#f0f0f0' },
  suggestBtn: { borderRadius: 8 },
  
  resultCard: { backgroundColor: '#ede7f6', marginTop: 5 },
  resultContent: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  resultImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#ddd' }, // Style for the result image

  row: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white' },
  thumbnail: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0' },
  textContainer: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  dishName: { fontWeight: 'bold', marginBottom: 2 },
  dishType: { color: 'gray' },

  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#6200ee' },
  emptyContainer: { alignItems: 'center', marginTop: 50 }
});