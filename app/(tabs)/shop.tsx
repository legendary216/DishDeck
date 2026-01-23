import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, Alert, ScrollView } from 'react-native';
import { Text, Checkbox, Button, FAB, IconButton, ActivityIndicator, Portal, Modal, TouchableRipple } from 'react-native-paper';
import { supabase } from '../../utils/supabase';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CACHE_KEY = 'SHOPPING_LIST_CACHE';

export default function ShoppingScreen() {
  const [sections, setSections] = useState<any[]>([]);
  
  // General Loading (Network)
  const [loading, setLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false);
  
  // Specific Action Loaders
  const [isImporting, setIsImporting] = useState(false); 
  const [isClearing, setIsClearing] = useState(false);   
  
  const [fabOpen, setFabOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayToImport, setSelectedDayToImport] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadCacheAndFetch();
    }, [])
  );

  const loadCacheAndFetch = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setSections(JSON.parse(cached));
        setLoading(false); 
      }
    } catch (e) { console.log(e); }

    await fetchFromSupabase();
  };

  const fetchFromSupabase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
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
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(sectionArray));
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFromSupabase();
    setRefreshing(false);
  };

  const confirmImportWeek = () => {
    Alert.alert(
      "Import Full Week",
      "Are you sure you want to add ingredients for the entire week?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Import All", onPress: () => importIngredients(null) }
      ]
    );
  };

  const importIngredients = async (specificDay: string | null = null) => {
    setIsImporting(true); 
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsImporting(false);
        return;
    }

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
      setIsImporting(false);
      setModalVisible(false);
      return;
    }

    const rowsToInsert: any[] = [];

    planData.forEach((row: any) => {
      const dishName = row.dishes?.name || "Unknown Dish";
      const rawIngredients = row.dishes?.ingredients || "";

      if (rawIngredients) {
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

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('shopping_list').insert(rowsToInsert);
      if (insertError) Alert.alert("Error", insertError.message);
      else {
        await fetchFromSupabase();
        const msg = specificDay 
            ? `Added items for ${specificDay}.` 
            : `Added ${rowsToInsert.length} items from your Weekly Plan.`;
        Alert.alert("Success", msg);
      }
    } else {
        Alert.alert("Info", "Dishes found, but no ingredients listed.");
    }

    setIsImporting(false);
    setModalVisible(false);
    setSelectedDayToImport(null);
  };

 const toggleItem = async (id: number, currentStatus: boolean) => {
    // 1. OPTIMISTIC UPDATE (Update UI immediately)
    const previousSections = [...sections]; // Keep a backup
    
    const newSections = sections.map(section => ({
      ...section,
      data: section.data.map((item: any) => 
        item.id === id ? { ...item, is_bought: !currentStatus } : item
      )
    }));

    setSections(newSections);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newSections));

    // 2. SEND TO DB
    const { error } = await supabase
      .from('shopping_list')
      .update({ is_bought: !currentStatus })
      .eq('id', id);

    // 3. ERROR HANDLING (Rollback if failed)
    if (error) {
      console.error("Update failed:", error);
      
      // Revert UI
      setSections(previousSections);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(previousSections));
      
      // Tell User
      Alert.alert("Sync Error", "Could not update item. Please check connection.");
    }
  };

  const clearList = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    Alert.alert("Clear List", "Delete everything?", [
        { text: "Cancel" },
        { text: "Delete All", style: 'destructive', onPress: async () => {
            setIsClearing(true); 
            await supabase.from('shopping_list').delete().eq('user_id', user.id);
            setSections([]); 
            AsyncStorage.removeItem(CACHE_KEY); 
            setIsClearing(false); 
        }}
    ]);
  };

  const handleDayConfirm = () => {
    if (selectedDayToImport) {
        importIngredients(selectedDayToImport);
    }
  };

  // LOGIC FIX:
  // Show Main Spinner IF:
  // 1. Initial Loading
  // 2. Importing (AND Modal is closed = Full Week Import)
  // EXCLUDED: isClearing (Delete) - because we use the top-right spinner for that.
  const showMainSpinner = (loading || (isImporting && !modalVisible)) && !refreshing;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{fontWeight:'bold'}}>Shopping List</Text>
        
        {/* DELETE LOADER: Top Right Only */}
        {isClearing ? (
            <ActivityIndicator animating={true} color="red" size="small" />
        ) : (
            <IconButton icon="delete-outline" iconColor="red" onPress={clearList} />
        )}
      </View>

      {/* MAIN SPINNER: Only for Imports or Initial Load */}
      {showMainSpinner && (
        <View style={{paddingVertical: 10}}>
            <ActivityIndicator animating={true} size="large" color="#6200ee" />
            {isImporting && <Text style={{textAlign:'center', marginTop:5, color:'#6200ee'}}>Importing items...</Text>}
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        
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
          !showMainSpinner ? (
            <View style={styles.emptyContainer}>
                <Text style={{color: 'gray'}}>List is empty.</Text>
                <Text style={{color: 'gray', fontSize: 12}}>Import from your plan to get started.</Text>
            </View>
          ) : null
        }
      />

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
            <Button onPress={() => setModalVisible(false)} style={{marginRight: 10}} disabled={isImporting}>Cancel</Button>
            
            <Button 
                mode="contained" 
                onPress={handleDayConfirm} 
                disabled={!selectedDayToImport || isImporting}
                loading={isImporting} 
            >
                {isImporting ? "Importing..." : "Import Items"}
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
          { icon: 'calendar-week', label: 'Import Full Week', onPress: confirmImportWeek },
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