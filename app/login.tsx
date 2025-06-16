import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export const loginUser = async (username: string, password: string) => {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    throw new Error('No user found with that username');
  }

  const { email } = profile;

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  
  if (loginError) {
    throw new Error(loginError.message);
  }

  return profile;
};

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setMessage('Please enter both username and password');
      return;
    }

    try {
      const userProfile = await loginUser(username, password);
      await AsyncStorage.setItem('userInfo', JSON.stringify(userProfile));
      setMessage('Login successful!');
      router.replace('/Dashboard/Profile');
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
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} placeholderTextColor="#FFFFFF"/>
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
