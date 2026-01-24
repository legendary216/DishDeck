import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { TextInput, Button, Text, Chip, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';
import { geminiModel } from '../utils/gemini'; 

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

export default function AddDishScreen() {
  const theme = useTheme(); 
  
  // STATE
  const [name, setName] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState('');
  const [recipe, setRecipe] = useState('');
  const [youtubeLink, setYoutubeLink] = useState(''); 
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- LOGIC ---

  // 1. AI Generation (Unchanged)
  const generateAIContent = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a dish name first.");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `List ingredients and steps for"${name}". 
      Format: INGREDIENTS: (list) RECIPE: (short steps). No intro. 
      important point : if it is not a edible item, say item is not edible or display funny message`;

      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text();

      const parts = text.split("RECIPE:");
      const ingredientsPart = parts[0].replace("INGREDIENTS:", "").trim();
      const recipePart = parts[1] ? parts[1].trim() : "";

      setIngredients(ingredientsPart);
      setRecipe(recipePart);
    } catch (error) {
      console.error(error);
      Alert.alert("AI Error", "Could not generate content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setName('');
    setSelectedTypes([]);
    setIngredients('');
    setRecipe('');
    setYoutubeLink('');
    setImageUri(null);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // 2. NEW: Camera + Gallery Logic
  const handleImagePick = async () => {
    Alert.alert(
      "Upload Photo",
      "Choose a method",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Take Photo", 
          onPress: () => openCamera() 
        },
        { 
          text: "Choose from Gallery", 
          onPress: () => openGallery() 
        },
      ]
    );
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission to access camera is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 3. Save Logic (Unchanged)
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Info", "Please enter a dish name.");
      return;
    }
    if (selectedTypes.length === 0) {
      Alert.alert("Missing Info", "Please select at least one meal type.");
      return;
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");
      
        let image_path = null;

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

            if (uploadError) throw new Error("Image upload failed");

            const { data: publicUrlData } = supabase.storage
                .from('dish-images')
                .getPublicUrl(fileName);
                
            image_path = publicUrlData.publicUrl;
        }

        const insertData = {
            user_id: user.id,
            name: name.trim(),
            type: selectedTypes.join(', '), 
            ingredients: ingredients.trim() || null,
            recipe: recipe.trim() || null,
            youtube_link: youtubeLink.trim() || null,
            image_path: image_path || null,
        };
        
        const { error: dbError } = await supabase.from('dishes').insert(insertData);
        if (dbError) throw new Error(dbError.message);

        router.replace('/(tabs)');

    } catch (error: any) {
        Alert.alert("Error Saving", error.message || "Something went wrong.");
    } finally {
        setLoading(false); 
    }
  };

  // --- RENDER ---
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      contentContainerStyle={{ paddingBottom: 50 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
    >
      
      {/* Header */}
      <Text variant="headlineMedium" style={[styles.header, { color: theme.colors.onSurface }]}>
        Add New Dish
      </Text>

      {/* Image Picker */}
      <TouchableOpacity onPress={handleImagePick} style={styles.imagePicker}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={[
              styles.placeholder, 
              { 
                  borderColor: theme.colors.outline, 
                  backgroundColor: theme.colors.surfaceVariant 
              }
            ]}>
            <IconButton icon="camera-plus" size={30} iconColor={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>Add Dish Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dish Name */}
      <TextInput
        label="Dish Name *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        activeOutlineColor={theme.colors.primary}
        outlineColor={theme.colors.outline}
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        textColor={theme.colors.onSurface}
        right={
            <TextInput.Icon 
                icon={isGenerating ? "loading" : "auto-fix"} 
                color={theme.colors.primary}
                onPress={generateAIContent}
                disabled={isGenerating}
                forceTextInputFocus={false}
            />
        }
      />

      {/* Meal Type */}
      <Text variant="titleMedium" style={[styles.label, { color: theme.colors.onSurface }]}>
        Meal Type *
      </Text>
      <View style={styles.chipRow}>
        {MEAL_TYPES.map((t) => {
          const isSelected = selectedTypes.includes(t);
          return (
            <Chip
              key={t}
              selected={isSelected}
              showSelectedOverlay
              style={[
                  styles.chip, 
                  { 
                      backgroundColor: isSelected ? theme.colors.secondaryContainer : theme.colors.surfaceVariant,
                      borderColor: theme.colors.outline 
                  }
              ]}
              textStyle={{ 
                  color: isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant 
              }}
              onPress={() => {
                if (isSelected) setSelectedTypes(prev => prev.filter(item => item !== t));
                else setSelectedTypes(prev => [...prev, t]);
              }}
            >
              {t}
            </Chip>
          );
        })}
      </View>

      {/* INGREDIENTS */}
      {/* Reduced minHeight to reduce spacing */}
      <View style={{ justifyContent: 'center' }}>
        {isGenerating ? (
          <View style={[styles.aiLoadingContainer, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
            <ActivityIndicator animating={true} color={theme.colors.primary} />
            <Text style={[styles.aiLoadingText, { color: theme.colors.primary }]}>Gemini is cooking up ingredients...</Text>
          </View>
        ) : (
          <TextInput
            label="Ingredients (Optional)"
            value={ingredients}
            onChangeText={setIngredients}
            mode="outlined"
            multiline
            numberOfLines={3}
            activeOutlineColor={theme.colors.primary}
            outlineColor={theme.colors.outline}
            // Reduced Margin Bottom
            style={[styles.input, { backgroundColor: theme.colors.surface, marginBottom: 8 }]}
          />
        )}
      </View>

      {/* RECIPE */}
      <View style={{ justifyContent: 'center' }}>
        {isGenerating ? (
          <View style={[styles.aiLoadingContainer, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
            <ActivityIndicator animating={true} color={theme.colors.primary} />
            <Text style={[styles.aiLoadingText, { color: theme.colors.primary }]}>Writing the instructions...</Text>
          </View>
        ) : (
          <TextInput
            label="Recipe / Notes (Optional)"
            value={recipe}
            onChangeText={setRecipe}
            mode="outlined"
            multiline
            numberOfLines={4}
            activeOutlineColor={theme.colors.primary}
            outlineColor={theme.colors.outline}
            // Reduced Margin Bottom
            style={[styles.input, { backgroundColor: theme.colors.surface, marginBottom: 8 }]}
          />
        )}
      </View>

      {/* YOUTUBE LINK */}
      <TextInput
        label="YouTube Link (Optional)"
        value={youtubeLink}
        onChangeText={setYoutubeLink}
        mode="outlined"
        placeholder="https://youtube.com/..."
        keyboardType="url"
        autoCapitalize="none"
        activeOutlineColor={theme.colors.primary}
        outlineColor={theme.colors.outline}
        // Reduced Margin Bottom
        style={[styles.input, { backgroundColor: theme.colors.surface, marginBottom: 8 }]}
        right={<TextInput.Icon icon="youtube" color={theme.colors.error} />}
      />

      {/* Buttons */}
      <Button 
        mode="contained" 
        onPress={handleSave} 
        loading={loading} 
        disabled={loading}
        buttonColor={theme.colors.primary}
        textColor={theme.colors.onPrimary}
        style={styles.saveBtn}
        contentStyle={{ height: 50 }}
      >
        {loading ? "Saving..." : "Save Dish"}
      </Button>

      <Button 
        mode="text" 
        onPress={() => router.back()} 
        disabled={loading}
        textColor={theme.colors.error}
        style={{ marginTop: 5 }}
      >
        Cancel
      </Button>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontWeight: '800', marginBottom: 20, marginTop: 40, textAlign: 'center' },
  
  // CHANGED: Reduced marginBottom from 15 to 10 for tighter spacing
  input: { marginBottom: 10 },
  
  label: { marginBottom: 10, marginTop: 5, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  chip: { borderWidth: 1 }, 
  saveBtn: { marginTop: 15, borderRadius: 8 }, // Slightly reduced top margin
  imagePicker: { alignItems: 'center', marginBottom: 20 },
  image: { width: '100%', height: 200, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  placeholder: { 
    width: '100%', 
    height: 150, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderStyle: 'dashed'
  },
  aiLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 10 // Reduced from 15
  },
  aiLoadingText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: 'bold',
    fontStyle: 'italic'
  },
});