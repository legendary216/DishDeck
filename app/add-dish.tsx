import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity,RefreshControl } from 'react-native';
import { TextInput, Button, Text, Chip, ActivityIndicator, HelperText } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo'; // <--- Import for network check

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

export default function AddDishScreen() {
  // 1. STATE VARIABLES (Make sure these exist!)
  const [name, setName] = useState('');
 const [selectedTypes, setSelectedTypes] = useState<string[]>([]); // <--- This is the "type" field
  const [ingredients, setIngredients] = useState('');
  const [recipe, setRecipe] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    
    // RESET ALL FIELDS
    setName('');
    setSelectedTypes([]);
    setIngredients('');
    setRecipe('');
    setImageUri(null);

    // Stop spinner after 1 second
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Compress image to save data
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    // 1. VALIDATION
    if (!name.trim()) {
      Alert.alert("Missing Info", "Please enter a dish name.");
      return;
    }

    // 2. CHECK NETWORK
    const state = await NetInfo.fetch();
    if (state.isConnected === false) {
        Alert.alert("Offline", "You cannot add new dishes while offline.");
        return;
    }

    setLoading(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not found");

        let image_path = null;

        // 3. IMAGE UPLOAD
        if (imageUri) {
            const ext = imageUri.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${ext}`;
            const formData = new FormData();
            
            // @ts-ignore
            formData.append('file', {
                uri: imageUri,
                name: fileName,
                type: `image/${ext}`,
            });

            const { error: uploadError } = await supabase.storage
                .from('dish-images')
                .upload(fileName, formData);

            if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

            const { data: publicUrlData } = supabase.storage
                .from('dish-images')
                .getPublicUrl(fileName);
                
            image_path = publicUrlData.publicUrl;
        }

        // 4. DATABASE INSERT
        // 1. Update Validation
if (selectedTypes.length === 0) {
  Alert.alert("Missing Info", "Please select at least one meal type.");
  return;
}

// ... inside the supabase.insert block:

const { error: dbError } = await supabase.from('dishes').insert({
    user_id: user.id,
    name: name.trim(),
    
    // JOIN THE ARRAY INTO A STRING
    type: selectedTypes.join(', '), 
    
    ingredients: ingredients.trim(),
    recipe: recipe.trim(),
    image_path: image_path,
});

        if (dbError) throw new Error(dbError.message);

        // Success -> Go back to Home
        router.replace('/(tabs)');

    } catch (error: any) {
        Alert.alert("Error", error.message || "Could not save dish.");
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}  refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <Text variant="headlineMedium" style={styles.header}>Add New Dish</Text>

      {/* IMAGE PICKER */}
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{color: '#aaa'}}>+ Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* NAME INPUT */}
      <TextInput
        label="Dish Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />

      {/* TYPE SELECTOR (Chips) */}
      <Text variant="titleMedium" style={styles.label}>Meal Type</Text>
      <View style={styles.chipRow}>
  {MEAL_TYPES.map((t) => {
    // Check if this type is currently in our list
    const isSelected = selectedTypes.includes(t);

    return (
      <Chip
        key={t}
        selected={isSelected}
        showSelectedOverlay
        style={styles.chip}
        onPress={() => {
          if (isSelected) {
            // If already selected, remove it (filter it out)
            setSelectedTypes(prev => prev.filter(item => item !== t));
          } else {
            // If not selected, add it to the list
            setSelectedTypes(prev => [...prev, t]);
          }
        }}
      >
        {t}
      </Chip>
    );
  })}
</View>

      {/* INGREDIENTS INPUT */}
      <TextInput
        label="Ingredients (Optional)"
        value={ingredients}
        onChangeText={setIngredients}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
        placeholder="e.g. 2 Eggs, Bread, Butter..."
      />
      <HelperText type="info">Separate items with commas or new lines.</HelperText>

      {/* RECIPE INPUT */}
      <TextInput
        label="Recipe / Notes (Optional)"
        value={recipe}
        onChangeText={setRecipe}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      {/* SAVE BUTTON */}
      <Button 
        mode="contained" 
        onPress={handleSave} 
        loading={loading} 
        disabled={loading}
        style={styles.saveBtn}
        contentStyle={{ height: 50 }}
      >
        Save Dish
      </Button>

      <Button 
        mode="text" 
        onPress={() => router.back()} 
        disabled={loading}
        style={{marginTop: 10}}
      >
        Cancel
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { fontWeight: 'bold', marginBottom: 20, marginTop: 40, textAlign: 'center' },
  input: { marginBottom: 15, backgroundColor: 'white' },
  label: { marginBottom: 10, marginTop: 5, fontWeight: 'bold' },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  chip: { backgroundColor: '#f0f0f0' },
  saveBtn: { marginTop: 20, borderRadius: 8 },
  
  imagePicker: { alignItems: 'center', marginBottom: 20 },
  image: { width: '100%', height: 200, borderRadius: 10 },
  placeholder: { 
    width: '100%', 
    height: 150, 
    borderRadius: 10, 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed'
  }
});