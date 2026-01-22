import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Linking } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, ActivityIndicator, IconButton } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../utils/supabase';

export default function DishDetailScreen() {
  const { id } = useLocalSearchParams(); 
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [imagePath, setImagePath] = useState('');

  useEffect(() => {
    fetchDishDetails();
  }, [id]);

  const fetchDishDetails = async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Error', 'Could not fetch dish details');
      router.back();
    } else {
      setName(data.name);
      setType(data.type);
      setIngredients(data.ingredients);
      setYoutubeLink(data.youtube_link);
      setImagePath(data.image_path);
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('dishes')
      .update({ name, type, ingredients, youtube_link: youtubeLink })
      .eq('id', id);

    setLoading(false);
    if (error) Alert.alert("Error", error.message);
    else {
      Alert.alert("Success", "Dish updated!");
      setIsEditing(false);
    }
  };

  // UPDATED: Deletes both the Image File and the Database Row
  const handleDelete = () => {
    Alert.alert(
      "Delete Dish",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setLoading(true);

            // 1. Delete Image from Storage (if it exists)
            if (imagePath) {
               // The imagePath is a full URL (e.g., https://.../dish-images/123.jpg)
               // We need just the filename ("123.jpg") to delete it.
               const fileName = imagePath.split('/').pop(); 

               if (fileName) {
                 const { error: storageError } = await supabase.storage
                   .from('dish-images')
                   .remove([fileName]);
                 
                 if (storageError) {
                   console.log("Warning: Could not delete image file", storageError);
                   // We continue anyway to ensure the dish is deleted from the DB
                 }
               }
            }

            // 2. Delete Row from Database
            const { error } = await supabase.from('dishes').delete().eq('id', id);
            
            if (error) {
               Alert.alert("Error", error.message);
               setLoading(false);
            } else {
               router.replace('/(tabs)'); 
            }
          }
        }
      ]
    );
  };

  const openLink = () => {
    if (youtubeLink) Linking.openURL(youtubeLink);
    else Alert.alert("No Link", "You didn't add a YouTube link for this dish.");
  };

  if (loading) return <ActivityIndicator style={styles.loader} size="large" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <View style={styles.topBar}>
        <Button icon="arrow-left" mode="text" onPress={() => router.back()}>Back</Button>
        <View style={{flexDirection: 'row'}}>
            {!isEditing && (
                <IconButton icon="trash-can" iconColor="red" onPress={handleDelete} />
            )}
            <Button mode="text" onPress={() => setIsEditing(!isEditing)}>
                {isEditing ? "Cancel" : "Edit"}
            </Button>
        </View>
      </View>

      <Image source={{ uri: imagePath || 'https://via.placeholder.com/300' }} style={styles.image} />
      
      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        disabled={!isEditing}
        style={styles.input}
      />

      <View style={styles.input}>
        <Text variant="bodyMedium" style={{marginBottom: 5, color: 'gray'}}>Type</Text>
        {isEditing ? (
            <SegmentedButtons
                value={type}
                onValueChange={setType}
                buttons={[
                { value: 'Breakfast', label: 'Breakfast' },
                { value: 'Lunch', label: 'Lunch' },
                { value: 'Dinner', label: 'Dinner' },
                ]}
            />
        ) : (
            <TextInput value={type} mode="outlined" disabled />
        )}
      </View>

      <TextInput
        label="Ingredients"
        value={ingredients}
        onChangeText={setIngredients}
        mode="outlined"
        multiline
        numberOfLines={4}
        disabled={!isEditing}
        style={styles.input}
      />

      <TextInput
        label="YouTube Link"
        value={youtubeLink}
        onChangeText={setYoutubeLink}
        mode="outlined"
        disabled={!isEditing}
        right={<TextInput.Icon icon="youtube" onPress={openLink} forceTextInputFocus={false}/>}
        style={styles.input}
      />

      {isEditing && (
        <Button mode="contained" onPress={handleUpdate} style={styles.saveButton}>
          Save Changes
        </Button>
      )}

      {!isEditing && youtubeLink ? (
        <Button icon="youtube" mode="contained" onPress={openLink} style={styles.ytButton} buttonColor="#FF0000">
            Watch Recipe
        </Button>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 50 },
  loader: { marginTop: 50 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 20 },
  input: { marginBottom: 15 },
  saveButton: { marginTop: 10 },
  ytButton: { marginTop: 20 }
});