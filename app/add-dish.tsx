import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { TextInput, Button, Text, Chip, HelperText } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';
import { geminiModel } from '../utils/gemini'; // Adjust the path if your folders are different
import { ActivityIndicator } from 'react-native-paper';
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

export default function AddDishScreen() {
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


  const generateAIContent = async () => {
  if (!name.trim()) {
    Alert.alert("Error", "Please enter a dish name first.");
    return;
  }

  setIsGenerating(true);
  try {
    const prompt = `Provide the ingredients and recipe for "${name}". 
    Format the response as plain text. 
    Start with "INGREDIENTS:" followed by the list, 
    then "RECIPE:" followed by steps. Keep it concise.`;

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();

    // Split the text to fill both boxes
    const parts = text.split("RECIPE:");
    const ingredientsPart = parts[0].replace("INGREDIENTS:", "").trim();
    const recipePart = parts[1] ? parts[1].trim() : "";

    setIngredients(ingredientsPart);
    setRecipe(recipePart);

  } catch (error) {
    console.error(error);
    Alert.alert("AI Error", "Could not generate content. Check your API key or connection.");
  } finally {
    setIsGenerating(false);
  }
};

  // REFRESH HANDLER (Pull to clear form)
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

  // IMAGE PICKER
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      // FIX: Use simple string array instead of deprecated Enum
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // SAVE HANDLER
  const handleSave = async () => {
    console.log("--- START SAVING ---"); 
    
    if (!name.trim()) {
      Alert.alert("Missing Info", "Please enter a dish name.");
      return;
    }
    if (selectedTypes.length === 0) {
      Alert.alert("Missing Info", "Please select at least one meal type.");
      return;
    }
    
    setLoading(true);
    console.log("--- enetring try catch ---"); 
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");
      
      console.log("--- entered ---"); 
        let image_path = null;

        // 1. UPLOAD IMAGE (If exists)
        if (imageUri) {
            console.log("Uploading Image...");
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

        // 2. PREPARE DATA
        // We use || null to ensure empty strings don't crash the DB
        const insertData = {
            user_id: user.id,
            name: name.trim(),
            type: selectedTypes.join(', '), 
            ingredients: ingredients.trim() || null,
            recipe: recipe.trim() || null,
            youtube_link: youtubeLink.trim() || null,
            image_path: image_path || null,
        };
        
        console.log("Inserting Data:", insertData);

        // 3. INSERT TO DB
        const { error: dbError } = await supabase.from('dishes').insert(insertData);

        if (dbError) {
            console.error("DB INSERT ERROR:", dbError);
            throw new Error(dbError.message);
        }

        console.log("Success!");
        router.replace('/(tabs)');

    } catch (error: any) {
        console.error("CATCH ERROR:", error);
        Alert.alert("Error Saving", error.message || "Something went wrong.");
    } finally {
        setLoading(false); 
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 50 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text variant="headlineMedium" style={styles.header}>Add New Dish</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{color: '#aaa'}}>+ Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        label="Dish Name *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        right={
    <TextInput.Icon 
      icon={isGenerating ? "loading" : "auto-fix"} 
      onPress={generateAIContent}
      disabled={isGenerating}
    />
  }
      />

      <Text variant="titleMedium" style={styles.label}>Meal Type *</Text>
      <View style={styles.chipRow}>
        {MEAL_TYPES.map((t) => {
          const isSelected = selectedTypes.includes(t);
          return (
            <Chip
              key={t}
              selected={isSelected}
              showSelectedOverlay
              style={[styles.chip, isSelected && { backgroundColor: '#eaddff' }]}
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

      {/* INGREDIENTS SECTION */}
<View style={{ minHeight: 100, justifyContent: 'center' }}>
  {isGenerating ? (
    <View style={styles.aiLoadingContainer}>
      <ActivityIndicator animating={true} color="#6200ee" />
      <Text style={styles.aiLoadingText}>Gemini is cooking up ingredients...</Text>
    </View>
  ) : (
    <TextInput
      label="Ingredients (Optional)"
      value={ingredients}
      onChangeText={setIngredients}
      mode="outlined"
      multiline
      numberOfLines={3}
      style={styles.input}
    />
  )}
</View>

{/* RECIPE SECTION */}
<View style={{ minHeight: 120, justifyContent: 'center' }}>
  {isGenerating ? (
    <View style={styles.aiLoadingContainer}>
      <ActivityIndicator animating={true} color="#6200ee" />
      <Text style={styles.aiLoadingText}>Writing the instructions...</Text>
    </View>
  ) : (
    <TextInput
      label="Recipe / Notes (Optional)"
      value={recipe}
      onChangeText={setRecipe}
      mode="outlined"
      multiline
      numberOfLines={4}
      style={styles.input}
    />
  )}
</View>

      <TextInput
        label="YouTube Link (Optional)"
        value={youtubeLink}
        onChangeText={setYoutubeLink}
        mode="outlined"
        placeholder="https://youtube.com/..."
        keyboardType="url"
        autoCapitalize="none"
        style={styles.input}
        right={<TextInput.Icon icon="youtube" color="red" />}
      />

      <Button 
        mode="contained" 
        onPress={handleSave} 
        loading={loading} 
        disabled={loading}
        style={styles.saveBtn}
        contentStyle={{ height: 50 }}
      >
        {loading ? "Saving..." : "Save Dish"}
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
    width: '100%', height: 150, borderRadius: 10, backgroundColor: '#f0f0f0', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed'
  },
  aiLoadingContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  backgroundColor: '#f5f5f5',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#e0e0e0',
  borderStyle: 'dashed',
  marginBottom: 15
},
aiLoadingText: {
  marginTop: 10,
  color: '#6200ee',
  fontSize: 12,
  fontWeight: 'bold',
  fontStyle: 'italic'
},
});