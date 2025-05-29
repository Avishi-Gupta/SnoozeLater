import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://192.168.1.196:3000/login', { email, password });
      setMessage('Login successful!');
      await AsyncStorage.setItem('token', response.data.token);
      console.log('Login successful, navigating to (tabs)');
      router.replace('./(tabs)'); // go to your main tabs screen after login
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
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Button title="Login" onPress={handleLogin} />
      {message ? <Text>{message}</Text> : null}
      <Text onPress={() => router.push('/register')} style={{ marginTop: 20, color: 'blue' }}>
        Don't have an account? Sign up
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: { borderWidth: 1, marginBottom: 15, padding: 10, borderRadius: 5 },
});
