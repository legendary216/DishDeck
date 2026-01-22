import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert ,Image} from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';

export default function DeckScreen() {
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // For the very first load
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh

  // 1. Load data when app opens
  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Also reload data whenever we come back to this tab (e.g. after adding a dish)
  useFocusEffect(
    useCallback(() => {
      fetchDishes();
    }, [])
  );

  // Helper to fetch data (does not control loading state)
  const fetchDishes = async () => {
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
  };

  // Wrapper for Initial Load (Shows full screen spinner)
  const loadInitialData = async () => {
    setLoading(true);
    await fetchDishes();
    setLoading(false);
  };

  // Wrapper for Pull-to-Refresh (Shows top spinner only)
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDishes();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>My Deck</Text>
        <Button icon="logout" onPress={handleLogout}>Log Out</Button>
      </View>

      {loading ? (
        <ActivityIndicator animating={true} size="large" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          
          // --- PULL TO REFRESH LOGIC ---
          refreshing={refreshing}
          onRefresh={onRefresh}
          // -----------------------------

          ListEmptyComponent={
            <Text style={styles.emptyText}>No dishes yet. Add one!</Text>
          }
        renderItem={({ item }) => {
            // 1. Sanitize URL (Trim spaces from ends, encode spaces in middle)
            const rawUrl = item.image_path || '';
            const imageUrl = rawUrl.trim().replace(/ /g, '%20');
            
            console.log("Loading Image:", imageUrl); // Check your terminal for this

            return (
              <Card 
                style={styles.card} 
                onPress={() => router.push({ pathname: '/dish/[id]', params: { id: item.id } })}
              >
                {/* 2. Use Standard Image Component for Debugging */}
                <Image 
                  source={{ uri: imageUrl || 'https://via.placeholder.com/300' }} 
                  style={{ width: '100%', height: 200, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                  resizeMode="cover"
                  onError={(e) => console.log("IMAGE ERROR:", e.nativeEvent.error)}
                />
                
                <Card.Title title={item.name} subtitle={item.type} />
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 40 },
  title: { fontWeight: 'bold' },
  card: { marginBottom: 15 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 18, color: '#888' }
});