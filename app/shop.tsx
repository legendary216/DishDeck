import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, Alert, ScrollView } from 'react-native';
import { Text, Checkbox, Button, FAB, IconButton, ActivityIndicator, Portal, Modal, TouchableRipple, useTheme, Divider } from 'react-native-paper';
import { supabase } from '../utils/supabase';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CACHE_KEY = 'SHOPPING_LIST_CACHE';

export default function ShoppingScreen() {
  const theme = useTheme(); // <--- Theme Engine
  const [sections, setSections] = useState<any[]>([]);
  
  // Loaders
  const [loading, setLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false); 
  const [isClearing, setIsClearing] = useState(false);   
  
  // UI State
  const [fabOpen, setFabOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayToImport, setSelectedDayToImport] = useState<string | null>(null);

  // --- DATA FETCHING (Unchanged Logic) ---
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
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(sectionArray));
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFromSupabase();
    setRefreshing(false);
  };

  // --- ACTIONS (Unchanged Logic) ---
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
    if (!user) { setIsImporting(false); return; }

    let query = supabase.from('weekly_plan').select('day, dishes(name, ingredients)').eq('user_id', user.id);
    if (specificDay) query = query.eq('day', specificDay);

    const { data: planData, error } = await query;

    if (error || !planData || planData.length === 0) {
      Alert.alert("Nothing Found", specificDay ? `No meals for ${specificDay}.` : "Plan is empty.");
      setIsImporting(false); setModalVisible(false); return;
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
                user_id: user.id, item: ingredient, dish_name: dishName, is_bought: false
            });
        });
      }
    });

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('shopping_list').insert(rowsToInsert);
      if (insertError) Alert.alert("Error", insertError.message);
      else {
        await fetchFromSupabase();
        const msg = specificDay ? `Added items for ${specificDay}.` : `Added ${rowsToInsert.length} items from your Weekly Plan.`;
        Alert.alert("Success", msg);
      }
    } else {
        Alert.alert("Info", "Dishes found, but no ingredients listed.");
    }
    setIsImporting(false); setModalVisible(false); setSelectedDayToImport(null);
  };

  const toggleItem = async (id: number, currentStatus: boolean) => {
    const previousSections = [...sections];
    const newSections = sections.map(section => ({
      ...section,
      data: section.data.map((item: any) => 
        item.id === id ? { ...item, is_bought: !currentStatus } : item
      )
    }));
    setSections(newSections);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newSections));
    const { error } = await supabase.from('shopping_list').update({ is_bought: !currentStatus }).eq('id', id);
    if (error) {
      setSections(previousSections);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(previousSections));
      Alert.alert("Sync Error", "Could not update item.");
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
            setSections([]); AsyncStorage.removeItem(CACHE_KEY); setIsClearing(false); 
        }}
    ]);
  };

  const handleDayConfirm = () => {
    if (selectedDayToImport) importIngredients(selectedDayToImport);
  };

  const showMainSpinner = (loading || (isImporting && !modalVisible)) && !refreshing;

  // --- RENDER ---
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineMedium" style={{ fontWeight: '800', color: theme.colors.onSurface }}>
            Shopping List
        </Text>
        
        {isClearing ? (
            <ActivityIndicator animating={true} color={theme.colors.error} size="small" />
        ) : (
            <IconButton icon="delete-outline" iconColor={theme.colors.error} onPress={clearList} />
        )}
      </View>

      {/* Main Spinner */}
      {showMainSpinner && (
        <View style={{ paddingVertical: 10, backgroundColor: theme.colors.background }}>
            <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
            {isImporting && <Text style={{ textAlign:'center', marginTop:5, color: theme.colors.primary }}>Importing items...</Text>}
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        
        renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
            </View>
        )}

        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
            <Checkbox.Android 
                status={item.is_bought ? 'checked' : 'unchecked'} 
                onPress={() => toggleItem(item.id, item.is_bought)}
                color={theme.colors.primary}
                uncheckedColor={theme.colors.outline}
            />
            <Text 
                variant="bodyLarge" 
                style={[
                    styles.itemText, 
                    { color: item.is_bought ? theme.colors.outline : theme.colors.onSurface },
                    item.is_bought && styles.strikethrough
                ]}
                onPress={() => toggleItem(item.id, item.is_bought)}
            >
                {item.item}
            </Text>
          </View>
        )}
        
        ListEmptyComponent={
          !showMainSpinner ? (
            <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>List is empty.</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Import from your plan to get started.</Text>
            </View>
          ) : null
        }
      />

      {/* Import Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleLarge" style={{ marginBottom: 15, textAlign:'center', fontWeight: 'bold', color: theme.colors.onSurface }}>
              Select a Day
          </Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {DAYS.map(day => (
                <TouchableRipple 
                    key={day} 
                    onPress={() => setSelectedDayToImport(day)} 
                    style={[
                        styles.modalOption, 
                        { borderBottomColor: theme.colors.surfaceVariant },
                        selectedDayToImport === day && { backgroundColor: theme.colors.secondaryContainer }
                    ]}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="bodyLarge" style={{ 
                            fontWeight: selectedDayToImport === day ? 'bold' : 'normal',
                            color: selectedDayToImport === day ? theme.colors.onSecondaryContainer : theme.colors.onSurface
                        }}>
                            {day}
                        </Text>
                        {selectedDayToImport === day && <IconButton icon="check" iconColor={theme.colors.primary} size={20} />}
                    </View>
                </TouchableRipple>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button onPress={() => setModalVisible(false)} style={{ marginRight: 10 }} textColor={theme.colors.error}>Cancel</Button>
            <Button 
                mode="contained" 
                onPress={handleDayConfirm} 
                disabled={!selectedDayToImport || isImporting}
                loading={isImporting} 
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
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
        color={theme.colors.onPrimaryContainer}
        fabStyle={{ backgroundColor: theme.colors.primaryContainer }}
        actions={[
          { 
              icon: 'delete', 
              label: 'Clear List', 
              onPress: clearList, 
              style: { backgroundColor: theme.colors.errorContainer }, 
              color: theme.colors.onErrorContainer 
          },
          { 
              icon: 'calendar-today', 
              label: 'Import Specific Day', 
              onPress: () => setModalVisible(true),
              style: { backgroundColor: theme.colors.surface },
              color: theme.colors.primary 
          },
          { 
              icon: 'calendar-week', 
              label: 'Import Full Week', 
              onPress: confirmImportWeek,
              style: { backgroundColor: theme.colors.surface },
              color: theme.colors.primary 
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
      paddingHorizontal: 20, 
      paddingTop: 50, // Matches other screens
      paddingBottom: 15,
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      elevation: 2 
  },
  sectionHeader: { 
      paddingVertical: 6, 
      paddingHorizontal: 12, 
      marginTop: 20, 
      marginBottom: 5,
      borderRadius: 8,
      alignSelf: 'flex-start' // Pill shape
  },
  sectionTitle: { 
      fontWeight: '700', 
      fontSize: 14,
      textTransform: 'uppercase',
      letterSpacing: 0.5
  },
  row: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: 10, 
      borderBottomWidth: 1, 
      marginLeft: 4 
  },
  itemText: { 
      fontSize: 16, 
      marginLeft: 10,
      flex: 1 
  },
  strikethrough: { 
      textDecorationLine: 'line-through', 
      opacity: 0.6 
  },
  emptyContainer: { 
      marginTop: 100, 
      alignItems: 'center',
      opacity: 0.7 
  },
  modal: { 
      padding: 20, 
      margin: 20, 
      borderRadius: 16 
  },
  modalOption: { 
      paddingVertical: 14, 
      paddingHorizontal: 12, 
      borderBottomWidth: 1,
      borderRadius: 8
  }
});