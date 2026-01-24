import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Alert, KeyboardAvoidingView, Platform, ScrollView, RefreshControl } from 'react-native';
import { TextInput, Button, useTheme, Text, Portal, Modal, Avatar } from 'react-native-paper';
import { supabase } from '../utils/supabase';

export default function LoginScreen() {
  const theme = useTheme();
  
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>(''); 
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);
  const [secureText, setSecureText] = useState<boolean>(true);

  useEffect(() => {
    let interval: any; 
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timer]);

  const validateEmail = (text: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  };

  async function handleAuth() {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // --- CLIENT SIDE VALIDATIONS ---
    if (!cleanEmail || !cleanPassword) return Alert.alert("Required", "Fill all fields.");
    if (!validateEmail(cleanEmail)) return Alert.alert("Invalid Email", "Please enter a valid email.");
    if (!isLoginMode && cleanPassword !== confirmPassword.trim()) return Alert.alert("Error", "Passwords do not match!");

    setLoading(true);
    
    const { data, error } = isLoginMode 
      ? await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword })
      : await supabase.auth.signUp({ email: cleanEmail, password: cleanPassword });

    if (error) {
      Alert.alert("Auth Error", error.message);
    } else {
      // --- THE "EXISTING USER" FIX ---
      if (!isLoginMode) {
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          Alert.alert(
            "Account Exists",
            "This email is already registered. Please log in.",
            [{ text: "Switch to Login", onPress: () => setIsLoginMode(true) }]
          );
        } else {
          setShowOtpModal(true);
          setTimer(60); 
        }
      }
    }
    setLoading(false);
  }

  async function handleVerifyOTP() {
    if (otpCode.length !== 8) return Alert.alert("Invalid", "Enter the 8-digit code.");

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: 'signup',
    });
    
    if (error) {
      Alert.alert("Failed", error.message);
    } else {
      setShowOtpModal(false);
      setIsLoginMode(true); 
      setOtpCode(''); 
      Alert.alert("Verified!", "Please log in now.");
    }
    setLoading(false);
  }

  async function handleResendOTP() {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) Alert.alert("Error", error.message);
    else { setTimer(60); Alert.alert("Sent", "Check your email for a new code."); }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} 
        keyboardShouldPersistTaps="handled"
      >
        {/* BRAND TITLE WITH COLOR ACCENT */}
        <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          Dish<Text style={{ color: theme.colors.primary }}>Deck</Text>
        </Text>
        <Text style={styles.subtitle}>{isLoginMode ? "Welcome back!" : "Join the kitchen."}</Text>
        
        {/* INPUT FIELDS WITH ICONS */}
        <TextInput 
          label="Email" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none" 
          keyboardType="email-address" 
          style={styles.input} 
          mode="outlined" 
          left={<TextInput.Icon icon="email-outline" />}
        />
        
        <TextInput 
          label="Password" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry={secureText} 
          style={styles.input} 
          mode="outlined" 
          left={<TextInput.Icon icon="lock-outline" />}
          right={<TextInput.Icon icon={secureText ? "eye-off" : "eye"} onPress={() => setSecureText(!secureText)} />}
        />

        {!isLoginMode && (
          <TextInput 
            label="Confirm Password" 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            secureTextEntry 
            style={styles.input} 
            mode="outlined" 
            left={<TextInput.Icon icon="shield-check-outline" />}
          />
        )}

        <Button 
          mode="contained" 
          onPress={handleAuth} 
          loading={loading} 
          style={styles.button}
          contentStyle={{ height: 48 }}
        >
          {isLoginMode ? "Login" : "Create Account"}
        </Button>

        <Button 
          mode="text" 
          onPress={() => setIsLoginMode(!isLoginMode)} 
          style={{ marginTop: 12 }}
        >
          {isLoginMode ? "New here? Sign Up" : "Already have an account? Log In"}
        </Button>

        {/* VERIFICATION MODAL */}
        <Portal>
          <Modal 
            visible={showOtpModal} 
            onDismiss={() => setShowOtpModal(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
              <ScrollView bounces={false} contentContainerStyle={{ alignItems: 'center' }}>
                <Avatar.Icon 
                  size={64} 
                  icon="shield-check-outline" 
                  style={{ marginBottom: 20, backgroundColor: theme.colors.primaryContainer }} 
                  color={theme.colors.primary}
                />
                
                <Text style={styles.modalTitle}>Confirm Email</Text>
                
                <Text style={styles.modalText}>
                  Enter the 8-digit code sent to{"\n"}
                  <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{email}</Text>
                </Text>

                <TextInput 
                  label="Verification Code" 
                  value={otpCode} 
                  onChangeText={setOtpCode} 
                  keyboardType="number-pad" 
                  maxLength={8} 
                  style={{ width: '100%', marginBottom: 24 }} 
                  mode="outlined" 
                  autoFocus
                />

                <Button 
                  mode="contained" 
                  onPress={handleVerifyOTP} 
                  loading={loading} 
                  style={{ width: '100%', borderRadius: 12 }}
                >
                  Verify Account
                </Button>

                <View style={{ marginTop: 16, alignItems: 'center' }}>
                  <Button 
                    mode="text" 
                    onPress={handleResendOTP} 
                    disabled={timer > 0 || loading}
                    textColor={timer > 0 ? theme.colors.outline : theme.colors.primary}
                  >
                    {timer > 0 ? `Resend in ${timer}s` : "Resend Code"}
                  </Button>

                  <Button 
                    mode="text" 
                    onPress={() => setShowOtpModal(false)} 
                    textColor={theme.colors.error}
                  >
                    Cancel
                  </Button>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        </Portal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 28, 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 42, 
    fontWeight: '900', 
    textAlign: 'center', 
    letterSpacing: -2, 
    marginBottom: 8 
  },
  subtitle: { 
    textAlign: 'center', 
    marginBottom: 40, 
    opacity: 0.5, 
    fontSize: 16,
    letterSpacing: 0.5 
  },
  input: { 
    marginBottom: 16, 
    backgroundColor: 'transparent' 
  },
  button: { 
    borderRadius: 14, 
    marginTop: 10
  },
  modal: { 
    padding: 24, 
    margin: 20, 
    borderRadius: 32, 
    marginTop: -200 // Shifts it up to clear keyboard
  },
  modalTitle: { 
    fontWeight: '900', 
    fontSize: 24,
    marginBottom: 4, 
    textAlign: 'center'
  },
  modalText: { 
    textAlign: 'center', 
    marginBottom: 24, 
    opacity: 0.6, 
    lineHeight: 20 
  }
});