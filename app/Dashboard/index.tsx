import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { updateUserProfile } from '../../lib/api';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem('userInfo');
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);

          setUser({
            username: typeof userInfo.username === 'string' ? userInfo.username : '',
            email: typeof userInfo.email === 'string' ? userInfo.email : '',
          });
        }
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    };

    loadUserInfo();
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/login'); // redirect to login screen
  };

  return (
    <View style={styles.container}>
      {user ? (
        <>
          <Text style={styles.title}>Welcome, {user.username}!</Text>
          <Text style={styles.subtitle}>Email: {user.email}</Text>

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

          <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.title}>Loading...</Text>
      )}
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