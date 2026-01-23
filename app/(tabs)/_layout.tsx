import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: '#6200ee',
    }}>
      <Tabs.Screen
        name="index" // This is now your Dashboard
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planner" // Your Weekly Planner
        options={{
          title: 'Planner',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-range" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library" // Your New Library (Old Index code)
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="book-multiple" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}