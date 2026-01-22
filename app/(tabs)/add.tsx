import React, { useState } from 'react';
import { StyleSheet, View, Image, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, ProgressBar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy'; // Keeping legacy import for upload
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../utils/supabase';
import { router } from 'expo-router';

export default function AddDishScreen() {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [type, setType] = useState('Lunch'); 
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Option 1: Pick from Gallery
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'We need access to your photos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Option 2: Take Photo with Camera
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'We need access to your camera.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Show Choice Menu
  const showImageOptions = () => {
    Alert.alert(
      "Add Photo",
      "Choose a method",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: pickImage },
      ]
    );
  };

  const uploadImage = async (uri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const fileData = decode(base64);
      const fileExt = uri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('dish-images')
        .upload(filePath, fileData, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      const { data } = supabase.storage.from('dish-images').getPublicUrl(filePath);
      return data.publicUrl;

    } catch (error) {
      console.error("Upload Error Details: ", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert("Missing Info", "Please add a name for the dish.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      let finalImageUrl = null;
      if (imageUri) {
        finalImageUrl = await uploadImage(imageUri);
      }

      const { error } = await supabase.from('dishes').insert({
        user_id: user.id,
        name: name,
        type: type,
        ingredients: ingredients,
        youtube_link: youtubeLink,
        image_path: finalImageUrl,
      });

      if (error) throw error;

      Alert.alert("Success", "Dish added to your deck!");
      // Reset
      setName('');
      setIngredients('');
      setImageUri(null);
      setYoutubeLink('');
      router.replace('/(tabs)'); 
      
    } catch (e: any) {
      Alert.alert("Error", e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.header}>New Dish</Text>

      {/* Tapping this triggers the Menu (Alert) */}
      <TouchableOpacity onPress={showImageOptions} style={styles.imagePicker}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{color: '#666'}}>Tap to add photo</Text>
            <Text style={{color: '#999', fontSize: 12, marginTop: 5}}>(Camera or Gallery)</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        label="Dish Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />

      <Text variant="titleMedium" style={styles.label}>Meal Type</Text>
      <SegmentedButtons
        value={type}
        onValueChange={setType}
        buttons={[
          { value: 'Breakfast', label: 'Breakfast' },
          { value: 'Lunch', label: 'Lunch' },
          { value: 'Dinner', label: 'Dinner' },
        ]}
        style={styles.input}
      />

      <TextInput
        label="Ingredients"
        value={ingredients}
        onChangeText={setIngredients}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      <TextInput
        label="YouTube Link (Optional)"
        value={youtubeLink}
        onChangeText={setYoutubeLink}
        mode="outlined"
        placeholder="https://youtube.com/..."
        style={styles.input}
      />

      {loading && <ProgressBar indeterminate style={styles.loader} />}

      <Button 
        mode="contained" 
        onPress={handleSave} 
        loading={loading} 
        disabled={loading}
        style={styles.saveButton}
      >
        Save to Deck
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 50 },
  header: { marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  imagePicker: { alignSelf: 'center', marginBottom: 20 },
  imagePreview: { width: 200, height: 200, borderRadius: 12 },
  placeholder: {
    width: 200, height: 200, backgroundColor: '#f0f0f0', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed',
  },
  input: { marginBottom: 15 },
  label: { marginBottom: 8 },
  saveButton: { marginTop: 10, paddingVertical: 6 },
  loader: { marginBottom: 10 }
});