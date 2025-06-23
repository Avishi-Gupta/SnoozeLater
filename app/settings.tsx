import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userInfo');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error("Failed to load user data", error);
      }
    };

    fetchUserData();
  }, []);


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



  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      setMessage('Please enter a new password.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMessage('Password updated successfully!');
      setNewPassword('');
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage('Unexpected error updating password.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={{ width: '80%' }}>
          <TextInput
            style={styles.input}
            placeholder="New username"
            placeholderTextColor="#888"
            value={newUsername}
            onChangeText={setNewUsername}
          />

          <TouchableOpacity style={styles.button} onPress={handleUpdateUsername}>
            <Text style={styles.buttonText}>Update Username</Text>
          </TouchableOpacity>

        <TextInput
        style={styles.input}
        placeholder="New password"
        placeholderTextColor="#888"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleUpdatePassword}>
          <Text style={styles.buttonText}>Update Password</Text>
          </TouchableOpacity>

          <Text style={styles.message}>{message}</Text>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#4e6ab0', marginTop: 30 }]}
                  onPress={() => router.replace('./Dashboard')}
                >
                  <Text style={styles.buttonText}>Back to Home</Text>
                </TouchableOpacity>
          </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    backgroundColor: '#816ec7',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    width: '100%',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    color: 'white',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
});