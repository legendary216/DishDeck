import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Linking, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text, SegmentedButtons, ActivityIndicator, IconButton, Surface, useTheme, Chip, Avatar, Divider, FAB } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../utils/supabase';

export default function DishDetailScreen() {
  const { id } = useLocalSearchParams(); 
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [recipe, setRecipe] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [imagePath, setImagePath] = useState('');

  useEffect(() => {
    fetchDishDetails();
  }, [id]);

  const fetchDishDetails = async () => {
    const { data, error } = await supabase.from('dishes').select('*').eq('id', id).single();
    if (error) {
      Alert.alert('Error', 'Could not fetch dish details');
      router.back();
    } else {
      setName(data.name);
      setType(data.type);
      setIngredients(data.ingredients);
      setRecipe(data.recipe || '');
      setYoutubeLink(data.youtube_link);
      setImagePath(data.image_path);
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase.from('dishes')
        .update({ name, type, ingredients, recipe, youtube_link: youtubeLink })
        .eq('id', id);

    setLoading(false);
    if (error) Alert.alert("Error", error.message);
    else setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Dish", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            setLoading(true);
            if (imagePath) {
               const fileName = imagePath.split('/').pop(); 
               if (fileName) await supabase.storage.from('dish-images').remove([fileName]);
            }
            const { error } = await supabase.from('dishes').delete().eq('id', id);
            if (error) { Alert.alert("Error", error.message); setLoading(false); } 
            else { router.replace('/(tabs)'); }
        }}
    ]);
  };

  const openLink = async () => {
    if (!youtubeLink) { Alert.alert("No Link", "No YouTube link added."); return; }
    const url = youtubeLink.trim();
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert("Invalid Link", "Cannot open this link.");
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      
      {/* FIXED BACK BUTTON (Always stays on top) */}
      <View style={styles.fixedHeaderActions}>
         <IconButton 
            icon="arrow-left" 
            iconColor="white" 
            containerColor="rgba(0,0,0,0.4)"
            size={24}
            onPress={() => router.back()} 
         />
         <View style={{ flexDirection: 'row' }}>
            {!isEditing && (
                <IconButton 
                    icon="trash-can-outline" 
                    iconColor={theme.colors.error} 
                    containerColor="rgba(255,255,255,0.9)"
                    size={24}
                    onPress={handleDelete} 
                />
            )}
            <IconButton 
                icon={isEditing ? "close" : "pencil"} 
                iconColor={isEditing ? "white" : theme.colors.primary} 
                containerColor={isEditing ? theme.colors.error : "rgba(255,255,255,0.9)"}
                size={24}
                onPress={() => setIsEditing(!isEditing)} 
            />
         </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        // KEY PROP: Index 1 is the Title Block. It will stick to the top.
        stickyHeaderIndices={[1]} 
      >
          
          {/* INDEX 0: THE IMAGE (Scrolls Away) */}
          <View style={styles.imageContainer}>
             <Image 
                source={{ uri: imagePath || 'https://via.placeholder.com/400' }} 
                style={styles.heroImage} 
                resizeMode="cover"
             />
             <View style={styles.imageOverlay} />
          </View>

          {/* INDEX 1: THE TITLE (Sticks to Top) */}
          <View style={[styles.stickyTitleContainer, { backgroundColor: theme.colors.background }]}>
             <View style={styles.sheetHandle} />
             {isEditing ? (
                 <View>
                    <TextInput label="Dish Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
                    <SegmentedButtons
                        value={type} onValueChange={setType}
                        buttons={[
                            { value: 'Breakfast', label: 'B-fast' },
                            { value: 'Lunch', label: 'Lunch' },
                            { value: 'Dinner', label: 'Dinner' },
                        ]}
                        style={{ marginTop: 5 }}
                    />
                 </View>
             ) : (
                 <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                        <Chip icon="food-variant" style={{ backgroundColor: theme.colors.primaryContainer }}>{type}</Chip>
                    </View>
                    <Text variant="displaySmall" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                        {name}
                    </Text>
                 </View>
             )}
             {/* Divider included in sticky header so content slides under it */}
             <Divider style={{ marginTop: 20, height: 1 }} />
          </View>

          {/* INDEX 2: THE CONTENT (Scrolls Under Title) */}
          <View style={[styles.contentBody, { backgroundColor: theme.colors.background }]}>
            
            {/* INGREDIENTS */}
            <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                    <Avatar.Icon size={36} icon="format-list-bulleted" style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginLeft: 12 }}>Ingredients</Text>
                </View>

                {isEditing ? (
                    <TextInput
                        mode="outlined" multiline numberOfLines={4} value={ingredients} onChangeText={setIngredients}
                        placeholder="List your ingredients here..." style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                    />
                ) : (
                    <Surface style={[styles.readSurface, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text variant="bodyLarge" style={{ lineHeight: 28, color: theme.colors.onSurface }}>
                            {ingredients || "No ingredients listed yet."}
                        </Text>
                    </Surface>
                )}
            </View>

            {/* RECIPE */}
            <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                    <Avatar.Icon size={36} icon="chef-hat" style={{ backgroundColor: theme.colors.tertiaryContainer }} color={theme.colors.onTertiaryContainer} />
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginLeft: 12 }}>Preparation</Text>
                </View>

                {isEditing ? (
                    <TextInput
                        mode="outlined" multiline numberOfLines={6} value={recipe} onChangeText={setRecipe}
                        placeholder="Step 1: Chop the onions..." style={[styles.input, { height: 150, textAlignVertical: 'top' }]}
                    />
                ) : (
                    <Surface style={[styles.readSurface, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text variant="bodyLarge" style={{ lineHeight: 28, color: theme.colors.onSurface }}>
                            {recipe || "No instructions added yet."}
                        </Text>
                    </Surface>
                )}
            </View>

            {/* VIDEO */}
            <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                    <Avatar.Icon size={36} icon="youtube" style={{ backgroundColor: '#FF0000' }} color="white" />
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginLeft: 12 }}>Tutorial</Text>
                </View>

                {isEditing ? (
                    <TextInput
                        label="YouTube Link" value={youtubeLink} onChangeText={setYoutubeLink} mode="outlined" style={styles.input}
                        left={<TextInput.Icon icon="link" />}
                    />
                ) : youtubeLink ? (
                    <Surface style={styles.videoCard} elevation={2} onTouchEnd={openLink}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <IconButton icon="play-circle" iconColor="#FF0000" size={30} style={{ margin: 0 }} />
                                <View style={{ marginLeft: 10 }}>
                                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>Watch Recipe</Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Tap to open YouTube</Text>
                                </View>
                            </View>
                            <IconButton icon="open-in-new" size={20} iconColor={theme.colors.outline} />
                        </View>
                    </Surface>
                ) : (
                    <Text style={{ fontStyle: 'italic', color: theme.colors.outline, marginLeft: 50 }}>No video link attached.</Text>
                )}
            </View>

            {/* Extra space for FAB and Keyboard */}
            <View style={{ height: 150 }} />
          </View>

      </ScrollView>

      {/* FLOATING SAVE BUTTON */}
      {isEditing && (
        <FAB
            icon="check"
            label="Save Changes"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color="white"
            onPress={handleUpdate}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // FIXED ACTIONS (Back Button)
  fixedHeaderActions: {
    position: 'absolute',
    top: 50, // Safe Area Top
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 999, // Super high zIndex
    elevation: 10,
  },

  // 1. IMAGE CONTAINER
  imageContainer: {
    height: 350,
    width: '100%',
    zIndex: 0,
  },
  heroImage: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)', 
  },

  // 2. STICKY HEADER (The Title)
  stickyTitleContainer: {
    marginTop: -40, // Pulls it over the image initially
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 10,
    elevation: 5, // Shadow when sticky
  },
  sheetHandle: {
    width: 40, height: 4, 
    backgroundColor: '#E0E0E0', 
    alignSelf: 'center', 
    borderRadius: 2, 
    marginBottom: 15 
  },

  // 3. CONTENT BODY
  contentBody: {
    padding: 24,
    paddingTop: 20,
    minHeight: 500,
  },

  sectionBlock: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  input: { backgroundColor: 'white', marginBottom: 10 },
  readSurface: { padding: 16, borderRadius: 16, backgroundColor: '#fff' },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});