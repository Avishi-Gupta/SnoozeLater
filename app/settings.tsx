import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';

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
        console.error('Failed to load user data', error);
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
      setMessage('✅ Username updated successfully!');
      setNewUsername('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred.');
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

      setMessage('✅ Password updated successfully!');
      setNewPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unexpected error updating password.');
    }
  };

  return (
<<<<<<< HEAD
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>⚙️ Settings</Text>
=======
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
>>>>>>> 4126348a4ecf838ead22091461accb546a78aaaf

        <Text style={styles.label}>Change Username</Text>
        <TextInput
<<<<<<< HEAD
          style={styles.input}
          placeholder="Enter new username"
          value={newUsername}
          onChangeText={setNewUsername}
        />
        <TouchableOpacity style={styles.button} onPress={handleUpdateUsername}>
          <Text style={styles.buttonText}>Update Username</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 24 }]}>Change Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
=======
        style={styles.input}
        placeholder="New password"
        placeholderTextColor="#888"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
>>>>>>> 4126348a4ecf838ead22091461accb546a78aaaf
        />
        <TouchableOpacity style={styles.button} onPress={handleUpdatePassword}>
          <Text style={styles.buttonText}>Update Password</Text>
        </TouchableOpacity>

        {message !== '' && <Text style={styles.message}>{message}</Text>}

<<<<<<< HEAD
        <TouchableOpacity
          style={[styles.button, { marginTop: 40, backgroundColor: '#4e6ab0' }]}
          onPress={() => router.replace('/Dashboard')}
        >
          <Text style={styles.buttonText}>⬅ Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
=======
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#4e6ab0', marginTop: 30 }]}
                  onPress={() => router.replace('./Dashboard')}
                >
                  <Text style={styles.buttonText}>Back to Home</Text>
                </TouchableOpacity>
          </View>
    </View>
>>>>>>> 4126348a4ecf838ead22091461accb546a78aaaf
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: '#816ec7',
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
  },
  label: {
    color: 'white',
    fontSize: 16,
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 16,
=======
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
>>>>>>> 4126348a4ecf838ead22091461accb546a78aaaf
  },
  input: {
    backgroundColor: '#fff',
    width: '100%',
<<<<<<< HEAD
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#5a75d3',
=======
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4e6ab0',
>>>>>>> 4126348a4ecf838ead22091461accb546a78aaaf
    paddingVertical: 14,
    width: '100%',
    borderRadius: 10,
<<<<<<< HEAD
    marginTop: 4,
    width: '100%',
    alignItems: 'center',
=======
    alignItems: 'center',
    marginBottom: 16,
>>>>>>> 4126348a4ecf838ead22091461accb546a78aaaf
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
<<<<<<< HEAD
    marginTop: 16,
    color: '#fff',
    fontStyle: 'italic',
=======
    color: 'white',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 20,
>>>>>>> 4126348a4ecf838ead22091461accb546a78aaaf
    textAlign: 'center',
  },
});