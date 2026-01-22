import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router } from 'expo-router';

export default function DeckScreen() {
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data when screen loads
  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    setLoading(true);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The _layout will handle the redirect
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
          ListEmptyComponent={
            <Text style={styles.emptyText}>No dishes yet. Add one!</Text>
          }
          renderItem={({ item }) => (
            <Card 
              style={styles.card} 
              onPress={() => router.push({ pathname: '/dish/[id]', params: { id: item.id } })} // <--- Navigate to detail page
            >
              <Card.Cover source={{ uri: item.image_path || 'https://via.placeholder.com/300' }} />
              <Card.Title title={item.name} subtitle={item.type} />
            </Card>
          )}
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