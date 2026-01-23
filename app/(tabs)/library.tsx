import React, { useState, useEffect,useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image } from 'react-native';
import { Text, Searchbar, FAB, List, Divider, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { router ,useFocusEffect} from 'expo-router';

export default function LibraryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dishes, setDishes] = useState<any[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Master List
  const fetchDishes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setDishes(data || []);
      setFilteredDishes(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
  useCallback(() => {
    // This runs when you ENTER the tab
    return () => {
      // This runs when you LEAVE the tab (Blur)
      setSearchQuery('');
      setFilteredDishes(dishes); // Reset the list to show everything
    };
  }, [dishes]) 
);

  useEffect(() => {
    fetchDishes();
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Your Library</Text>
        <Searchbar
          placeholder="Search your dishes..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchBar}
          elevation={1}
        />
      </View>

      <FlatList
        data={filteredDishes}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDishes} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            titleStyle={styles.dishTitle}
            description={item.type || 'General'}
            onPress={() => router.push({ pathname: '/dish/[id]', params: { id: item.id } })}
            left={props => (
              item.image_path ? 
              <Image source={{ uri: item.image_path }} style={styles.thumb} /> : 
              <List.Icon {...props} icon="food-outline" />
            )}
            right={props => <List.Icon {...props} icon="chevron-right" color="#CCC" />}
            style={styles.listItem}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={{ color: '#999' }}>
                {searchQuery ? "No dishes match your search." : "Your library is empty."}
              </Text>
            </View>
          ) : null
        }
      />

      <FAB
        icon="plus"
        label="Add New"
        style={styles.fab}
        onPress={() => router.push('/add-dish')}
        color="#FFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#FFF' },
  title: { fontWeight: 'bold', marginBottom: 15 },
  searchBar: { borderRadius: 12, backgroundColor: '#F5F5F5' },
  listContent: { paddingBottom: 100 },
  listItem: { paddingVertical: 10 },
  dishTitle: { fontWeight: '600', fontSize: 17 },
  thumb: { width: 50, height: 50, borderRadius: 8, marginLeft: 10 },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200EE',
    borderRadius: 16,
  },
  emptyState: { alignItems: 'center', marginTop: 50 },
});