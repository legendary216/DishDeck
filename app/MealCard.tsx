import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Card, Text, Button, IconButton } from 'react-native-paper';

interface MealCardProps {
  type: 'Breakfast' | 'Lunch' | 'Dinner';
  dish?: {
    id: string;
    name: string;
    image_path?: string;
  } | null;
  onPress: () => void;
}

export default function MealCard ({ type, dish, onPress }: MealCardProps)  {
  if (!dish) {
    // EMPTY STATE
    return (
      <TouchableOpacity onPress={onPress} style={styles.emptyCard}>
        <IconButton icon="plus-circle-outline" size={30} iconColor="#6750A4" />
        <Text variant="titleMedium" style={{ color: '#6750A4' }}>
          Add {type}
        </Text>
      </TouchableOpacity>
    );
  }

  // FILLED STATE
  return (
    <Card style={styles.filledCard} onPress={onPress}>
      <Card.Cover 
        source={{ uri: dish.image_path || 'https://via.placeholder.com/300' }} 
        style={styles.cardImage}
      />
      <View style={styles.overlay}>
        <View>
          <Text variant="labelMedium" style={styles.typeLabel}>{type.toUpperCase()}</Text>
          <Text variant="headlineSmall" style={styles.dishName}>{dish.name}</Text>
        </View>
        <IconButton icon="swap-horizontal" mode="contained" containerColor="white" onPress={onPress} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  emptyCard: {
    height: 120,
    borderWidth: 2,
    borderColor: '#EADDFF',
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#F6F2FF'
  },
  filledCard: {
    height: 180,
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 4
  },
  cardImage: { height: 180 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)', // Gradient darkener for text readability
  },
  typeLabel: { color: '#EADDFF', fontWeight: 'bold', letterSpacing: 1 },
  dishName: { color: 'white', fontWeight: 'bold' }
});