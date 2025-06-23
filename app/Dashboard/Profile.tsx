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
    points?: number;
  } | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userInfo');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', parsedUser.id)
            .single();

          if (data?.avatar_url) {
            setImageUri(data.avatar_url);
          }
        }
      } catch (error) {
        console.error('Failed to load user info or avatar:', error);
      }
    };

    loadUserInfo();
  }, []);

  const handlePickAndUploadImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow photo access to update your profile picture.');
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
          console.error('Upload error:', uploadError);
          Alert.alert('Upload failed', uploadError.message);
          return;
        }
  
        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(filePath);
  
        const publicUrl = urlData.publicUrl;

        setImageUri(publicUrl);
  
        await supabase.from('profiles').upsert({
          id: userId,
          avatar_url: publicUrl,
        });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Error', 'Something went wrong while updating your profile picture.');
    }
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
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.points}>🏆 {user.points ?? 0} pts</Text>
        </>
      ) : (
        <Text style={styles.loadingText}>Loading profile...</Text>
      )}

      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>Weekly Insights</Text>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>😴 Sleep: 7.2 hrs/day</Text>
          <Text style={styles.placeholderText}>📚 Study: 3.8 hrs/day</Text>
          <Text style={styles.placeholderNote}>Based on your latest activity data.</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.buttonText}>Go to Settings</Text>
      </TouchableOpacity>
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
    marginBottom: 10,
  },
  email: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
  },
  points: {
    fontSize: 20,
    color: '#ffd700', // gold
    fontWeight: '600',
    marginBottom: 30,
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 30,
  },
  insightsContainer: {
    width: '100%',
    marginBottom: 30,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    color: 'white',
    fontWeight: '600',
    marginBottom: 10,
  },
  placeholderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  placeholderNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
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