import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
//import { loginUser } from '../lib/api';
import { supabase } from '../lib/supabase';

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password');
      return;
    }

    try {
      await loginUser(email, password);
      setMessage('Login successful!');
      router.replace('/Dashboard');
    } catch (error) {
        if (error instanceof Error) {
    setMessage(error.message);
  } else {
    setMessage('An unexpected error occurred');
  }
    }
  };


  return (
    <View style={styles.container}>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} placeholderTextColor="#FFFFFF"/>
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor="#FFFFFF"/>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
      {message ? <Text>{message}</Text> : null}
      <Button title="Don't have an account? Sign up" onPress={() => router.push('/register')} color='#ffffff'/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#816ec7' },
  input: { borderWidth: 1, marginBottom: 15, padding: 10, borderRadius: 5, borderColor: 'white', color: 'white' },
    button: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  }
});
