import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    try {
      await axios.post('http://192.168.1.196:3000/register', { email, password });
      setMessage('Registered successfully!');
      router.replace('/login'); // back to login after registering
    } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as any).response?.data?.error
    ) {
      setMessage('Registration failed: ' + (err as any).response.data.error);
    } else if (err instanceof Error) {
      setMessage('Registration failed: ' + err.message);
    } else {
      setMessage('Registration failed: Unknown error');
    }
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Button title="Register" onPress={handleRegister} />
      {message ? <Text>{message}</Text> : null}
      <Text onPress={() => router.push('/login')} style={{ marginTop: 20, color: 'blue' }}>
        Already have an account? Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: { borderWidth: 1, marginBottom: 15, padding: 10, borderRadius: 5 },
});