import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { supabase } from '../../utils/supabase'; // Import the client we made

export default function Index() {

  const sendTestData = async () => {
    try {
      // USING YOUR MODULE:
      const { error } = await supabase
        .from('countries')
        .insert({ 
          id: Date.now(), // Using timestamp so every click is unique
          name: 'Mordor' 
        });

      if (error) {
        console.error("Supabase Error:", error);
        Alert.alert("Error", error.message);
      } else {
        console.log("Data sent successfully!");
        Alert.alert("Success", "Sent 'Mordor' to Supabase!");
      }
    } catch (e) {
      console.error("Unexpected Error:", e);
      Alert.alert("Error", "Check console for details.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Connection Test</Text>
      <Text style={styles.subtitle}>Click below to add "Mordor" to the DB</Text>
      
      <Button title="Send Test Data" onPress={sendTestData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 20,
    color: 'gray',
  }
});