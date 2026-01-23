import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, FAB, ActivityIndicator, Divider, Chip, Button, Card, IconButton, Searchbar } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const CACHE_KEY = 'DISHES_CACHE';

export default function DeckScreen() {
  const [dishes, setDishes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Suggest State
  const [quickType, setQuickType] = useState('Lunch');
  const [suggestion, setSuggestion] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadCacheAndFetch();
    }, [])
  );

  const loadCacheAndFetch = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setDishes(JSON.parse(cachedData));
        setLoading(false); 
      }
    } catch (e) { console.log(e); }

    await fetchFromSupabase();
  };

  const fetchFromSupabase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setDishes(data);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFromSupabase();
    setRefreshing(false);
  };

 const handleLogout = async () => {
    setLoading(true);
    try {
        // 1. Tell Supabase to sign out
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            Alert.alert("Logout Error", error.message);
            setLoading(false); // Stop loading if there's an actual error
        } else {
            // 2. Clear state and redirect
            // We DON'T set loading to false here because the 
            // component will unmount/navigate away anyway.
            router.replace('/login'); 
        }
    } catch (err) {
        console.error(err);
        setLoading(false); // Safety catch
    }
};
  // --- UPDATED LOGIC: NEVER SHOW SAME DISH TWICE ---
  const handleQuickSuggest = () => {
    // 1. Get all valid candidates for this meal type
    const candidates = dishes.filter(d => 
        d.type && d.type.toLowerCase().includes(quickType.toLowerCase())
    );

    if (candidates.length === 0) {
        Alert.alert("No Options", `You don't have any dishes tagged as ${quickType} yet.`);
        setSuggestion(null);
        return;
    }

    // 2. If we only have 1 dish, we have to show it (we can't switch)
    if (candidates.length === 1) {
        setSuggestion(candidates[0]);
        return;
    }

    // 3. If we have multiple, filter out the CURRENT suggestion
    let pool = candidates;
    if (suggestion) {
        pool = candidates.filter(d => d.id !== suggestion.id);
    }

    // 4. Pick from the new pool (which guarantees a change)
    const randomDish = pool[Math.floor(Math.random() * pool.length)];
    setSuggestion(randomDish);
  };

  const filteredDishes = dishes.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.type.toLowerCase().includes(q);
  });

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

  const getSuggestionImage = () => {
    if (!suggestion || !suggestion.image_path) return 'https://via.placeholder.com/150';
    return suggestion.image_path.trim().replace(/ /g, '%20');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>My Kitchen</Text>
        
        {isLoggingOut ? (
            <ActivityIndicator animating={true} color="red" size="small" />
        ) : (
            <TouchableOpacity onPress={handleLogout}>
                <Text style={{color: 'red', fontWeight: 'bold'}}>Log Out</Text>
            </TouchableOpacity>
        )}
      </View>

      <View style={styles.suggestContainer}>
        <Text variant="titleLarge" style={{marginBottom: 12, fontWeight:'bold', color:'#333'}}>
            Quick Decide 🎲
        </Text>
        
        <View style={styles.chipRow}>
            {MEAL_TYPES.map(type => (
                <Chip 
                    key={type} 
                    selected={quickType === type} 
                    onPress={() => {
                        setQuickType(type);
                        setSuggestion(null); // Reset when changing category
                    }}
                    style={styles.chip}
                    textStyle={{ fontSize: 14 }}
                    showSelectedOverlay
                >
                    {type}
                </Chip>
            ))}
        </View>

        {!suggestion ? (
            <Button 
                mode="contained" 
                onPress={handleQuickSuggest} 
                style={styles.suggestBtn}
                contentStyle={{ height: 55 }} 
                labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
            >
                Pick for Me
            </Button>
        ) : (
            <Card style={styles.resultCard}>
                <View style={styles.resultContent}>
                    <Image 
                        source={{ uri: getSuggestionImage() }} 
                        style={styles.resultImage} 
                    />
                    
                    <View style={{flex: 1, marginLeft: 15, justifyContent: 'center'}}>
                        <Text style={{color:'#6200ee', fontWeight:'bold', marginBottom: 4, fontSize: 13}}>
                            How about...
                        </Text>
                        <Text variant="headlineSmall" style={{fontWeight:'bold', lineHeight: 28}} numberOfLines={2}>
                            {suggestion.name}
                        </Text>
                    </View>
                    
                    <IconButton 
                        icon="refresh" 
                        iconColor="#6200ee" 
                        size={30} 
                        onPress={handleQuickSuggest} 
                    />
                </View>
            </Card>
        )}
      </View>
      
      <View style={styles.listHeaderContainer}>
        <Searchbar
            placeholder="Search your dishes..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={{minHeight: 0}} 
        />
        <Text style={styles.listHeaderText}>
             {searchQuery ? `Searching for "${searchQuery}"` : "Here is your list 📜"}
        </Text>
      </View>

      {loading && !refreshing && dishes.length === 0 ? (
        <ActivityIndicator animating={true} size="large" style={{marginTop: 50}} />
      ) : (
        <FlatList
            data={filteredDishes} 
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ItemSeparatorComponent={() => <Divider />}
            ListEmptyComponent={
            <View style={styles.emptyContainer}>
                {searchQuery ? (
                    <Text style={{color: 'gray'}}>No dishes match "{searchQuery}"</Text>
                ) : (
                    <>
                        <Text style={{fontSize: 50, marginBottom: 10}}>🍲</Text>
                        <Text style={{color: 'gray'}}>No dishes yet.</Text>
                    </>
                )}
            </View>
            }
            renderItem={renderDishRow}
        />
      )}

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

  suggestContainer: { paddingHorizontal: 20, paddingBottom: 15 },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  chip: { backgroundColor: '#f0f0f0', paddingVertical: 2 },
  suggestBtn: { borderRadius: 12, justifyContent: 'center' },
  
  resultCard: { backgroundColor: '#ede7f6', marginTop: 5, borderRadius: 16 },
  resultContent: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  resultImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#ddd' }, 

  listHeaderContainer: { 
    backgroundColor: '#f9f9f9', 
    paddingVertical: 15, 
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  searchBar: {
    marginBottom: 10,
    backgroundColor: 'white',
    elevation: 0, 
    borderWidth: 1,
    borderColor: '#ddd',
    height: 45,
  },
  listHeaderText: {
    color: '#777',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 5
  },

  row: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white' },
  thumbnail: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0' },
  textContainer: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  dishName: { fontWeight: 'bold', marginBottom: 2 },
  dishType: { color: 'gray' },

  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#6200ee' },
  emptyContainer: { alignItems: 'center', marginTop: 50 }
});