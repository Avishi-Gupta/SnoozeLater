import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';

export const updateUserProfile = async (newUsername: string) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not logged in.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message);
  }
};

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [message, setMessage] = useState('');


  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      setMessage('Please enter a new username.');
      return;
    }

    try {
      await updateUserProfile(newUsername);
      const updatedUser = {
        username: newUsername,
        email: user?.email ?? '',
      };
      setUser(updatedUser);
      await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setMessage('Username updated successfully!');
      setNewUsername('');
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage('An unexpected error occurred.');
      }
    }
  };

  return (
    <View style={styles.container}>
          <TextInput
            style={styles.input}
            placeholder="New username"
            value={newUsername}
            onChangeText={setNewUsername}
          />

          <TouchableOpacity style={styles.button} onPress={handleUpdateUsername}>
            <Text style={styles.buttonText}>Update Username</Text>
          </TouchableOpacity>

          <Text style={styles.message}>{message}</Text>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#4e6ab0', marginTop: 30 }]}
                  onPress={() => router.replace('./Dashboard')}
                >
                  <Text style={styles.buttonText}>Back to Home</Text>
                </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 60, alignItems: 'center', backgroundColor: '#816ec7' },
  title: { fontSize: 20, marginBottom: 20, color: 'white', fontWeight: '600' },
  subtitle: {fontSize: 16, marginBottom: 20, color: 'white'},
  input: {
    backgroundColor: 'white',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
    button: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    color: 'white',
    marginTop: 10,
    textAlign: 'center',
  },
});