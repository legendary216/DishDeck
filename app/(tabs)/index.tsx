import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, FAB, ActivityIndicator, Divider } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';

export default function DeckScreen() {
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDishes();
    }, [])
  );

  const fetchDishes = async () => {
    // If we are pulling to refresh, don't show the full screen loader
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

  // --- NEW COMPACT ROW RENDERER ---
  const renderDishRow = ({ item }: { item: any }) => {
    // Sanitize URL
    const rawUrl = item.image_path || '';
    const imageUrl = rawUrl.trim().replace(/ /g, '%20') || 'https://via.placeholder.com/150';

    return (
      <TouchableOpacity 
        style={styles.row} 
        onPress={() => router.push({ pathname: '/dish/[id]', params: { id: item.id } })}
      >
        {/* Small Thumbnail Image */}
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.thumbnail} 
          resizeMode="cover"
        />
        
        {/* Text Details */}
        <View style={styles.textContainer}>
          <Text variant="titleMedium" style={styles.dishName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.dishType}>
            {item.type}
          </Text>
        </View>

        {/* Arrow Icon (Optional visual cue) */}
        <Text style={{color: '#ccc', fontSize: 20}}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>My Kitchen</Text>
        {/* Simple Logout Text Button */}
        <TouchableOpacity onPress={handleLogout}>
            <Text style={{color: 'red', fontWeight: 'bold'}}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing && (
        <ActivityIndicator animating={true} size="large" style={{marginTop: 50}} />
      )}

      <FlatList
        data={dishes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }} // Space for FAB
        refreshing={refreshing}
        onRefresh={onRefresh}
        ItemSeparatorComponent={() => <Divider />} // Thin line between rows
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
                <Text style={{fontSize: 50, marginBottom: 10}}>🍲</Text>
                <Text style={{color: 'gray'}}>No dishes yet.</Text>
                <Text style={{color: 'gray'}}>Tap the + button to add one.</Text>
            </View>
          ) : null
        }
        renderItem={renderDishRow}
      />

      {/* THE ADD BUTTON (FAB) */}
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
  container: { flex: 1, backgroundColor: '#fff' }, // Changed to white for cleaner look
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    marginTop: 50, 
    marginBottom: 10 
  },
  title: { fontWeight: 'bold' },
  
  // Row Styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  dishName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  dishType: {
    color: 'gray',
  },

  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  }
});