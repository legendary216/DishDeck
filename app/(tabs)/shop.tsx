import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, Alert, ScrollView } from 'react-native';
import { Text, Checkbox, Button, FAB, IconButton, ActivityIndicator, Portal, Modal, TouchableRipple } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { useFocusEffect } from 'expo-router';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ShoppingScreen() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // <--- New State for Refreshing
  
  const [fabOpen, setFabOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayToImport, setSelectedDayToImport] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchList();
    }, [])
  );

  const fetchList = async () => {
    // Only show big loader if NOT refreshing (prevent double spinners)
    if (!refreshing) setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('user_id', user.id)
      .order('is_bought', { ascending: true }) 
      .order('id', { ascending: true });       

    if (data) {
      const grouped: any = {};
      
      data.forEach(row => {
        const header = row.dish_name || 'General Items';
        if (!grouped[header]) grouped[header] = [];
        grouped[header].push(row);
      });

      const sectionArray = Object.keys(grouped).map(key => ({
        title: key,
        data: grouped[key]
      }));
      
      setSections(sectionArray);
    }
    setLoading(false);
  };

  // --- PULL TO REFRESH FUNCTION ---
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchList();
    setRefreshing(false);
  };

  const importIngredients = async (specificDay: string | null = null) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('weekly_plan')
      .select('day, dishes(name, ingredients)')
      .eq('user_id', user.id);

    if (specificDay) {
      query = query.eq('day', specificDay);
    }

    const { data: planData, error } = await query;

    if (error || !planData || planData.length === 0) {
      Alert.alert("Nothing Found", specificDay ? `No meals for ${specificDay}.` : "Plan is empty.");
      setLoading(false);
      setModalVisible(false);
      return;
    }

    const rowsToInsert: any[] = [];

    planData.forEach((row: any) => {
      const dishName = row.dishes?.name || "Unknown Dish";
      const rawIngredients = row.dishes?.ingredients || "";

      if (rawIngredients) {
        // FIX: Explicitly tell TypeScript these are strings
        const parts: string[] = rawIngredients.split(/[\n,]/).map((i: string) => i.trim()).filter((i: string) => i.length > 0);
        const uniqueParts = [...new Set(parts)];

        uniqueParts.forEach((ingredient: string) => {
            rowsToInsert.push({
                user_id: user.id,
                item: ingredient,
                dish_name: dishName,
                is_bought: false
            });
        });
      }
    });

    if (rowsToInsert.length === 0) {
      Alert.alert("Info", "Dishes found, but no ingredients listed.");
    } else {
      const { error: insertError } = await supabase.from('shopping_list').insert(rowsToInsert);
      if (insertError) Alert.alert("Error", insertError.message);
      else {
        fetchList();
        Alert.alert("Success", `Added items from ${specificDay || "Weekly Plan"}.`);
      }
    }

    setLoading(false);
    setModalVisible(false);
    setSelectedDayToImport(null);
  };

  const toggleItem = async (id: number, currentStatus: boolean) => {
    // 1. OPTIMISTIC UPDATE (Instant)
    setSections(prevSections => {
      return prevSections.map(section => ({
        ...section,
        data: section.data.map((item: any) => 
          item.id === id 
            ? { ...item, is_bought: !currentStatus } 
            : item
        )
      }));
    });

    // 2. Background Save
    const { error } = await supabase
      .from('shopping_list')
      .update({ is_bought: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error("Update failed:", error);
      fetchList(); // Revert on error
    }
  };

  const clearList = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    Alert.alert("Clear List", "Delete everything?", [
        { text: "Cancel" },
        { text: "Delete All", style: 'destructive', onPress: async () => {
            setLoading(true);
            await supabase.from('shopping_list').delete().eq('user_id', user.id);
            fetchList();
            setLoading(false);
        }}
    ]);
  };

  const handleDayConfirm = () => {
    if (selectedDayToImport) {
        importIngredients(selectedDayToImport);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{fontWeight:'bold'}}>Shopping List</Text>
        <IconButton icon="delete-outline" iconColor="red" onPress={clearList} />
      </View>

      {/* Main Spinner (Initial Load Only) */}
      {loading && !refreshing && <ActivityIndicator animating={true} style={{marginBottom: 10}} />}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        
        // --- ADDED REFRESH PROPS ---
        refreshing={refreshing}
        onRefresh={onRefresh}
        // ---------------------------

        renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
        )}

        renderItem={({ item }) => (
          <View style={styles.row}>
            <Checkbox.Android 
                status={item.is_bought ? 'checked' : 'unchecked'} 
                onPress={() => toggleItem(item.id, item.is_bought)}
                color="#6200ee"
            />
            <Text 
                variant="bodyLarge" 
                style={[styles.itemText, item.is_bought && styles.strikethrough]}
                onPress={() => toggleItem(item.id, item.is_bought)}
            >
                {item.item}
            </Text>
          </View>
        )}
        
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{color: 'gray'}}>List is empty.</Text>
            <Text style={{color: 'gray', fontSize: 12}}>Import from your plan to get started.</Text>
          </View>
        }
      />

      {/* --- DAY PICKER MODAL --- */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{marginBottom: 15, textAlign:'center'}}>Select a Day</Text>
          
          <ScrollView style={{maxHeight: 300}}>
            {DAYS.map(day => (
                <TouchableRipple 
                    key={day} 
                    onPress={() => setSelectedDayToImport(day)} 
                    style={[
                        styles.modalOption, 
                        selectedDayToImport === day && styles.selectedOption 
                    ]}
                >
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                        <Text variant="bodyLarge" style={selectedDayToImport === day ? {color: '#6200ee', fontWeight:'bold'} : {}}>
                            {day}
                        </Text>
                        {selectedDayToImport === day && <IconButton icon="check" iconColor="#6200ee" size={20} />}
                    </View>
                </TouchableRipple>
            ))}
          </ScrollView>
          
          <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop: 20}}>
            <Button onPress={() => setModalVisible(false)} style={{marginRight: 10}}>Cancel</Button>
            <Button 
                mode="contained" 
                onPress={handleDayConfirm}
                disabled={!selectedDayToImport}
            >
                Import Items
            </Button>
          </View>
        </Modal>
      </Portal>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          { icon: 'delete', label: 'Clear List', onPress: clearList, style: { backgroundColor: '#ffebee' }, color: 'red' },
          { icon: 'calendar-today', label: 'Import Specific Day', onPress: () => setModalVisible(true) },
          { icon: 'calendar-week', label: 'Import Full Week', onPress: () => importIngredients(null) },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { marginTop: 40, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeader: { backgroundColor: '#f0f0f0', padding: 8, marginTop: 15, borderRadius: 5 },
  sectionTitle: { fontWeight: 'bold', color: '#555', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', marginLeft: 10 },
  itemText: { fontSize: 16, marginLeft: 10 },
  strikethrough: { textDecorationLine: 'line-through', color: 'gray' },
  emptyContainer: { marginTop: 100, alignItems: 'center' },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedOption: { backgroundColor: '#f3e5f5' }
});