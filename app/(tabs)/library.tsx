import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image } from 'react-native';
import { Text, Searchbar, FAB, List, Divider, useTheme } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PickDish from '../pick-dish';
export default function LibraryScreen() {
  const theme = useTheme(); // <--- Hook into your Theme Engine
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dishes, setDishes] = useState<any[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Master List
  const fetchDishes = async () => {
    try {
      // Check Cache first
      const cachedData = await AsyncStorage.getItem('library_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setDishes(parsed);
        setFilteredDishes(parsed);
        setLoading(false); 
      } else {
        setLoading(true);
      }

      // Fetch from Supabase (Silent Background Fetch)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('dishes')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (data) {
        setDishes(data);
        setFilteredDishes(data);
        await AsyncStorage.setItem('library_cache', JSON.stringify(data));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

 useFocusEffect(
    useCallback(() => {
      // 1. WHEN YOU ARRIVE (FOCUS)
      // Reset text
      setSearchQuery('');
      // Reset list from the Master Inventory
      setFilteredDishes(dishes); 

      return () => {
        // 2. WHEN YOU LEAVE (BLUR)
        // Wipe it clean so it's ready for next time
        setSearchQuery('');
        setFilteredDishes(dishes);
      };
    }, [dishes]) // Re-binds if your master list changes
  );
  useEffect(() => {
    const checkUserAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchDishes();
      }
    };
    checkUserAndFetch();
  }, []);

  // 2. Client-Side Search Logic
  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = dishes.filter((dish) =>
      dish.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredDishes(filtered);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineMedium" style={{ fontWeight: '800', marginBottom: 15, color: theme.colors.onSurface }}>
            Your Library
        </Text>
        <Searchbar
          placeholder="Search your dishes..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          inputStyle={{ color: theme.colors.onSurfaceVariant }}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.outline}
          elevation={0} // Flat modern look
        />
      </View>

     {!searchQuery && (
          <PickDish />
      )}

      <FlatList
        data={filteredDishes}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDishes} colors={[theme.colors.primary]} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            titleStyle={{ fontWeight: '600', fontSize: 16, color: theme.colors.onSurface }}
            description={item.type || 'General'}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            onPress={() => router.push({ pathname: '/dish/[id]', params: { id: item.id } })}
            left={props => (
              item.image_path ? 
              <Image source={{ uri: item.image_path }} style={[styles.thumb, { backgroundColor: theme.colors.surfaceVariant }]} /> : 
              <List.Icon {...props} icon="food-outline" color={theme.colors.primary} />
            )}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.outline} />}
            style={styles.listItem}
            rippleColor={theme.colors.primaryContainer}
          />
        )}
        ItemSeparatorComponent={() => <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>
                {searchQuery ? "No dishes match your search." : "Your library is empty."}
              </Text>
            </View>
          ) : null
        }
      />

      <FAB
        icon="plus"
        label="Add New"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/add-dish')}
        mode="elevated"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 60, paddingBottom: 10 },
  searchBar: { borderRadius: 12 },
  listContent: { paddingBottom: 100 },
  listItem: { paddingVertical: 8, paddingHorizontal: 10 },
  thumb: { width: 48, height: 48, borderRadius: 12, marginLeft: 10 },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 20,
    borderRadius: 16,
  },
  emptyState: { alignItems: 'center', marginTop: 50 },
});