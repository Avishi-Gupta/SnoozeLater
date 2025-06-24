import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import DefaultProfileImage from '../../assets/images/blank-profile-picture-973460_1280.png';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
  } | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [avgSleepDuration, setAvgSleepDuration] = useState<number | null>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userInfo');

        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          if (parsed.avatar_url) setImageUri(parsed.avatar_url);
          await fetchWeeklySleep(parsed.id);
          return;
        }

        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, username, email, avatar_url')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error.message);
          return;
        }

        setUser(profile);
        if (profile.avatar_url) setImageUri(profile.avatar_url);
        await AsyncStorage.setItem('userInfo', JSON.stringify(profile));
        await fetchWeeklySleep(profile.id);

      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    };

    const fetchWeeklySleep = async (userId: string) => {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data, error } = await supabase
          .from('points_log')
          .select('duration_slept, created_at')
          .eq('user_id', userId)
          .eq('type', 'sleep')
          .gte('created_at', oneWeekAgo.toISOString());

        if (error) {
          console.error('Error fetching weekly sleep insights:', error);
          setAvgSleepDuration(null);
          return;
        }

        if (!data || data.length === 0) {
          setAvgSleepDuration(null);
          return;
        }

        const totalDuration = data.reduce((sum, entry) => sum + (entry.duration_slept || 0), 0);
        const avgDuration = totalDuration / data.length;
        setAvgSleepDuration(avgDuration);

      } catch (err) {
        console.error('Unexpected error fetching weekly sleep:', err);
        setAvgSleepDuration(null);
      }
    };

    loadUserInfo();
  }, []);

  const handlePickAndUploadImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow access to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        const image = result.assets[0];
        const userId = user?.id;
        if (!userId) throw new Error('User not found');

        const fileExt = image.uri.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const base64 = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, base64, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError.message);
          Alert.alert('Upload failed', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;
        setImageUri(publicUrl);

        const updatedProfile = { ...user, avatar_url: publicUrl };
        setUser(updatedProfile);
        await AsyncStorage.setItem('userInfo', JSON.stringify(updatedProfile));

        await supabase.from('profiles').upsert({
          id: userId,
          avatar_url: publicUrl,
        });
      }
    } catch (err) {
      console.error('Image upload error:', err);
      Alert.alert('Error', 'Something went wrong while uploading.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('userInfo');
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePickAndUploadImage}>
        <Image
          source={imageUri ? { uri: imageUri } : DefaultProfileImage}
          style={styles.profileImage}
        />
      </TouchableOpacity>

      {user ? (
        <>
          <Text style={styles.username}>Welcome {user.username}!</Text>
  
          <View style={styles.insightsContainer}>
            <View style={styles.insightsCard}>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>😴 Sleep:</Text>
                <Text style={styles.insightValue}>
                  {avgSleepDuration !== null ? `${avgSleepDuration.toFixed(1)} hrs/day` : 'No data'}
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>📚 Study:</Text>
                <Text style={styles.insightValue}>3.8 hrs/day</Text>
              </View>
              <Text style={styles.insightNote}>Based on your latest activity data.</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.button, { marginBottom: 15 }]} onPress={() => router.push('/settings')}>
            <Text style={styles.buttonText}>Go to Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.loadingText}>Loading profile...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#816ec7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4e6ab0',
  },
  username: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 30,
  },
  insightsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    color: 'white',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    width: '100%',
    // left aligned content
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
  },
  insightNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
