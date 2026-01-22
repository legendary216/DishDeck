import React, { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { TextInput, Button, Title, HelperText } from 'react-native-paper';
import { supabase } from '../utils/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  async function handleAuth() {
    setLoading(true);
    const { error } = isLoginMode 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) Alert.alert("Error", error.message);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Title style={styles.title}>DishDeck</Title>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
        mode="outlined"
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        mode="outlined"
      />

      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={handleAuth} loading={loading} style={styles.button}>
          {isLoginMode ? "Login" : "Sign Up"}
        </Button>
        <Button mode="text" onPress={() => setIsLoginMode(!isLoginMode)}>
          {isLoginMode ? "Create Account" : "Log In"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#6200ee' },
  input: { marginBottom: 12 },
  buttonContainer: { marginTop: 20 },
  button: { paddingVertical: 6 }
});