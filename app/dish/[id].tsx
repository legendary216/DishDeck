import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Linking ,TouchableOpacity} from 'react-native';
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* HERO IMAGE SECTION */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imagePath || 'https://via.placeholder.com/300' }} 
            style={styles.image} 
          />
          {/* OVERLAY BUTTONS */}
          <View style={styles.overlayTop}>
            <IconButton 
              icon="arrow-left" 
              containerColor="rgba(255,255,255,0.8)" 
              onPress={() => router.back()} 
            />
            <View style={{flexDirection: 'row'}}>
               {!isEditing && (
                 <IconButton 
                   icon="trash-can-outline" 
                   iconColor="#FF5252" 
                   containerColor="rgba(255,255,255,0.8)" 
                   onPress={handleDelete} 
                 />
               )}
               <IconButton 
                 icon={isEditing ? "close" : "pencil-outline"} 
                 containerColor={isEditing ? "#FF5252" : "rgba(255,255,255,0.8)"}
                 iconColor={isEditing ? "white" : "black"}
                 onPress={() => setIsEditing(!isEditing)} 
               />
            </View>
          </View>
        </View>

        <View style={styles.detailsBox}>
          {/* TITLE & CATEGORY */}
          {isEditing ? (
            <TextInput
              label="Dish Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />
          ) : (
            <Text style={styles.dishTitle}>{name}</Text>
          )}

          <View style={styles.badgeRow}>
             <View style={styles.typeBadge}>
               <Text style={styles.typeText}>{type}</Text>
             </View>
          </View>

          {isEditing && (
             <View style={{marginBottom: 20}}>
               <Text style={styles.sectionLabel}>Change Category</Text>
               <SegmentedButtons
                 value={type}
                 onValueChange={setType}
                 buttons={[
                   { value: 'Breakfast', label: 'B-fast' },
                   { value: 'Lunch', label: 'Lunch' },
                   { value: 'Dinner', label: 'Dinner' },
                 ]}
               />
             </View>
          )}

          <View style={styles.separator} />

          {/* INGREDIENTS SECTION */}
          <View style={styles.sectionHeader}>
            <IconButton icon="fridge-outline" size={20} />
            <Text style={styles.sectionLabel}>Ingredients</Text>
          </View>
          
       <View style={[styles.ingredientsContainer, !isEditing && styles.viewingModeContainer]}>
  <TextInput
    value={ingredients}
    onChangeText={setIngredients}
    mode="flat"
    multiline
    // FIX: Use readOnly instead of disabled for better visibility
    readOnly={!isEditing} 
    placeholder="No ingredients listed..."
    style={styles.ingredientsInput}
    underlineColor="transparent"
    activeUnderlineColor="transparent"
    // This ensures the text color remains high-contrast
    textColor="#2C3E50" 
  />
</View>
          {/* YOUTUBE SECTION */}
          <View style={styles.sectionHeader}>
            <IconButton icon="youtube" size={20} iconColor="#FF0000" />
            <Text style={styles.sectionLabel}>Video Tutorial</Text>
          </View>

          {isEditing ? (
            <TextInput
              value={youtubeLink}
              onChangeText={setYoutubeLink}
              mode="outlined"
              placeholder="Paste YouTube Link"
              style={styles.input}
            />
          ) : youtubeLink ? (
            <TouchableOpacity onPress={openLink} style={styles.ytCard}>
               <Text style={styles.ytCardText}>Watch on YouTube</Text>
               <IconButton icon="open-in-new" size={18} iconColor="white" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.noLinkText}>No video link provided</Text>
          )}

          {isEditing && (
            <Button 
              mode="contained" 
              onPress={handleUpdate} 
              style={styles.saveButton}
              contentStyle={{height: 50}}
            >
              Update Dish
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingBottom: 50 },
  loader: { flex: 1, justifyContent: 'center' },
  
  // Header Image
  imageContainer: { width: '100%', height: 300, position: 'relative' },
  image: { width: '100%', height: '100%' },
  overlayTop: { 
    position: 'absolute', top: 40, left: 10, right: 10, 
    flexDirection: 'row', justifyContent: 'space-between' 
  },

  // Content Box
  detailsBox: { 
    marginTop: -30, backgroundColor: '#F8F9FA', 
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 25, flex: 1
  },
  dishTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', marginBottom: 20 },
  typeBadge: { 
    backgroundColor: '#EADDFF', paddingHorizontal: 15, paddingVertical: 5, 
    borderRadius: 20 
  },
  typeText: { color: '#6750A4', fontWeight: 'bold', fontSize: 12 },
  
  separator: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 10 },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginLeft: -10 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#444' },
  // ingredientsInput: { 
  //   backgroundColor: 'transparent', fontSize: 16, lineHeight: 24, 
  //   paddingHorizontal: 0, marginBottom: 20 
  // },
  disabledInput: { color: '#333', opacity: 1 },
  
  // YouTube Card
  ytCard: { 
    backgroundColor: '#FF0000', borderRadius: 12, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 55, marginTop: 5
  },
  ytCardText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  noLinkText: { color: '#888', fontStyle: 'italic', marginLeft: 10 },

  input: { marginBottom: 15, backgroundColor: 'white' },
  saveButton: { marginTop: 30, borderRadius: 12 },

  ingredientsContainer: {
    borderRadius: 12,
    backgroundColor: '#ffffff', // White background to pop against the light gray
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  viewingModeContainer: {
    backgroundColor: '#F1F3F5', // Light contrast for viewing mode
    borderColor: 'transparent',
  },
  ingredientsInput: { 
    backgroundColor: 'transparent', 
    fontSize: 16, 
    lineHeight: 24,
    minHeight: 100,
    paddingHorizontal: 10,
  },
});