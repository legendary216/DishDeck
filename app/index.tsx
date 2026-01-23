import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  // We show a loader here because the _layout.tsx will 
  // immediately redirect the user before they even see this.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#6200ee" />
    </View>
  );
}