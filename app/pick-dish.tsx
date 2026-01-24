import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, Avatar, IconButton, useTheme, ActivityIndicator, TouchableRipple } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <--- Import this

export default function PickDish() {
  const theme = useTheme();
  const [randomDish, setRandomDish] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // LOGIC: Fetch from Local Cache instead of DB
  const pickRandomDish = async () => {
    setLoading(true);
    
    try {
      // 1. Get from Cache
      const cachedData = await AsyncStorage.getItem('library_cache');
      
      if (cachedData) {
        const dishes = JSON.parse(cachedData);
        
        if (dishes.length > 0) {
           // 2. Add a tiny fake delay (500ms) so the "Rolling..." animation is visible
           setTimeout(() => {
             const randomIndex = Math.floor(Math.random() * dishes.length);
             setRandomDish(dishes[randomIndex]);
             setLoading(false);
           }, 500);
           return;
        }
      }
      
      // If we get here, cache was empty or null
      setLoading(false);
      Alert.alert("Empty", "No dishes found in your library.");

    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const close = () => setRandomDish(null);

  // --- STATE 1: RESULT (Compact Row) ---
  if (randomDish) {
    return (
        <Card style={[styles.container, { backgroundColor: theme.colors.primaryContainer }]}>
            <View style={styles.resultRow}>
                {/* Left: Tiny Image */}
                {randomDish.image_path ? (
                    <Avatar.Image size={40} source={{ uri: randomDish.image_path }} />
                ) : (
                    <Avatar.Icon size={40} icon="food" style={{ backgroundColor: theme.colors.primary }} />
                )}

                {/* Middle: Text info */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        WHY NOT COOK...
                    </Text>
                    <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: '800' }}>
                        {randomDish.name}
                    </Text>
                </View>

                {/* Right: Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconButton icon="refresh" size={20} onPress={pickRandomDish} />
                    <Button 
                        mode="contained" 
                        compact 
                        onPress={() => router.push({ pathname: '/dish/[id]', params: { id: randomDish.id } })}
                        style={{ marginLeft: 5 }}
                    >
                        View
                    </Button>
                    <IconButton icon="close" size={16} onPress={close} style={{ marginLeft: 0 }} />
                </View>
            </View>
        </Card>
    );
  }

  // --- STATE 2: DEFAULT (Slim Button) ---
  return (
    <Card 
        mode="contained" 
        style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}
        onPress={loading ? undefined : pickRandomDish}
    >
        <TouchableRipple onPress={pickRandomDish} style={{ borderRadius: 12 }}>
            <View style={styles.triggerRow}>
                <Avatar.Icon 
                    size={36} 
                    icon={loading ? "loading" : "auto-fix"} 
                    color={theme.colors.onSurfaceVariant}
                    style={{ backgroundColor: 'rgba(0,0,0,0.05)' }} 
                />
                
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                        {loading ? "Rolling..." : "Surprise Me"}
                    </Text>
                    {!loading && (
                        <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                            Pick a random dish from cache
                        </Text>
                    )}
                </View>

                {!loading && <IconButton icon="chevron-right" size={20} style={{ margin: 0 }} />}
            </View>
        </TouchableRipple>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginBottom: 15, 
    marginTop: 10,
    borderRadius: 12, 
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10, 
    height: 60, 
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingRight: 5,
  }
});