import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { register, acceptTos } from '../lib/api';
import { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const TOS_VERSION = '2026-06';

export default function RegisterScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');
    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await register({
        fullName,
        email,
        phone: phone || undefined,
        password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await acceptTos(TOS_VERSION);
      await signIn(accessToken, refreshToken, user);
    } catch (err: any) {
      setError(err?.error ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={fullName}
          onChangeText={setFullName}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone (optional)"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
        <Text style={styles.hint}>
          At least 8 characters, including an uppercase letter, a number, and a special character (!@#$%^&amp;*)
        </Text>

        <Text style={styles.tos}>
          By signing up you agree to our Terms of Service.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  error: { backgroundColor: '#fdecea', color: '#c62828', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 14 },
  hint: { fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 18 },
  tos: { fontSize: 12, color: '#888', marginBottom: 20, lineHeight: 18 },
  button: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#1a73e8', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
