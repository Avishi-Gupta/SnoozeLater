import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import { registerUser } from '../lib/api';
import { supabase } from '../lib/supabase';

export const registerUser = async (email: string, password: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const user = data.user;
  if (!user) throw new Error('No user returned after signup');

  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{ id: user.id, username, email }]);

  if (profileError) {
    throw new Error('Profile creation failed: ' + profileError.message);
  }


  return data;
};

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !username) {
      setMessage('Please enter email, username, and password');
      return;
    }

    try {
      await registerUser(email, password, username);
      setMessage('Registered successfully!');
      router.replace('/login');
    } catch (error) {
      if (error instanceof Error) {
        setMessage('Registration failed: ' + error.message);
      } else {
        setMessage('Registration failed: Unknown error');
      }
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} placeholderTextColor="#FFFFFF"/>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} placeholderTextColor="#FFFFFF" textContentType="username" returnKeyType="next"/>
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor="#FFFFFF"/>
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>
      {message ? <Text>{message}</Text> : null}
      <Button title="Already have an account? Login" onPress={() => router.push('/login')} color='#ffffff'/>
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
  },
  message: {
    color: 'white',
    marginTop: 10,
    textAlign: 'center',
  }
});