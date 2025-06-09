// import { Image } from 'expo-image';
// import { Platform, StyleSheet } from 'react-native';

// import { HelloWave } from '@/components/HelloWave';
// import ParallaxScrollView from '@/components/ParallaxScrollView';
// import { ThemedText } from '@/components/ThemedText';
// import { ThemedView } from '@/components/ThemedView';

// export default function HomeScreen() {
//   return (
//     <ParallaxScrollView
//       headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
//       headerImage={
//         <Image
//           source={require('@/assets/images/partial-react-logo.png')}
//           style={styles.reactLogo}
//         />
//       }>
//       <ThemedView style={styles.titleContainer}>
//         <ThemedText type="title">Welcome!</ThemedText>
//         <HelloWave />
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <ThemedText type="subtitle">Step 1: Try it</ThemedText>
//         <ThemedText>
//           Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
//           Press{' '}
//           <ThemedText type="defaultSemiBold">
//             {Platform.select({
//               ios: 'cmd + d',
//               android: 'cmd + m',
//               web: 'F12',
//             })}
//           </ThemedText>{' '}
//           to open developer tools.
//         </ThemedText>
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <ThemedText type="subtitle">Step 2: Explore</ThemedText>
//         <ThemedText>
//           {`Tap the Explore tab to learn more about what's included in this starter app.`}
//         </ThemedText>
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
//         <ThemedText>
//           {`When you're ready, run `}
//           <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
//           <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
//           <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
//           <ThemedText type="defaultSemiBold">app-example</ThemedText>.
//         </ThemedText>
//       </ThemedView>
//     </ParallaxScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   titleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   stepContainer: {
//     gap: 8,
//     marginBottom: 8,
//   },
//   reactLogo: {
//     height: 178,
//     width: 290,
//     bottom: 0,
//     left: 0,
//     position: 'absolute',
//   },
// });

import AsyncStorage from '@react-native-async-storage/async-storage';
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
    await AsyncStorage.removeItem('userInfo');
    router.replace('/login'); // or navigate to login screen
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