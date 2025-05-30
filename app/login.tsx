import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://192.168.29.93:3000/login', { email, password });
      if (!email.trim() || !password.trim()) {
    setMessage('Please enter both email and password');
    return;
  }
      setMessage('Login successful!');
      await AsyncStorage.setItem('token', response.data.token);
      router.replace('./Dashboard'); // go to your main tabs screen after login
    } catch (err: unknown) {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    (err as any).response?.data?.error
  ) {
    setMessage('Login failed: ' + (err as any).response.data.error);
  } else if (err instanceof Error) {
    setMessage('Login failed: ' + err.message);
  } else {
    setMessage('Login failed: Unknown error');
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
