import axios from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://192.168.1.195:3000/login', { email, password });
      setMessage('Login successful! Token: ' + response.data.token);
      // Save the token securely for future API calls (AsyncStorage or Context)
    } catch (err) {
      setMessage('Login failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Login" onPress={handleLogin} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Text>Don't have an account? <Link href="/Register">Sign up</Link></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 50 },
  input: { marginBottom: 10, borderWidth: 1, padding: 20, borderRadius: 4 },
  message: { marginTop: 10, color: 'red' },
});
