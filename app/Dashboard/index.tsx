import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import DefaultProfileImage from '../../assets/images/blank-profile-picture-973460_1280.png';
import Badges from '../../components/Badges';
import { supabase } from '../../lib/supabase';


type Badge = {
  badge_type: string;
  earned_at: string;
};

type User = {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  badges?: string[] | null;
};

export default function Profile() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [avgSleep, setAvgSleep] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  //const [badges, setBadges] = useState<Badge[]>([]);
  const [badges, setBadges] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
    const loadUserInfo = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, username, email, avatar_url, badges')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error.message);
          return;
        }


        const refreshedProfile: User = {
          ...profile,
          avatar_url: profile.avatar_url ? `${profile.avatar_url}?v=${Date.now()}` : undefined,
          badges: profile.badges || [],
        };

        setUser(refreshedProfile);
        setBadges(refreshedProfile.badges || []);
        if (refreshedProfile.avatar_url) setImageUri(refreshedProfile.avatar_url);

        await AsyncStorage.setItem('userInfo', JSON.stringify(refreshedProfile));

        await fetchAverageSleep(refreshedProfile.id);
        await fetchTotalPoints(refreshedProfile.id);
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    };

const fetchAverageSleep = async (userId: string) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6); 

  const { data, error } = await supabase
    .from('sleep_data')
    .select('duration_slept')
    .eq('user_id', userId)
    .gte('sleep_date', startDate.toISOString());

  if (error) {
    console.error('Error fetching sleep data:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    setAvgSleep(null);
    return;
  }
  const validDurations = data
    .map((row) => Number(row.duration_slept))
    .filter((val) => !isNaN(val) && val > 0);

  if (validDurations.length === 0) {
    setAvgSleep(null);
    return;
  }

  const total = validDurations.reduce((sum, val) => sum + val, 0);
  setAvgSleep(total / validDurations.length);
};

    const fetchTotalPoints = async (userId: string) => {
      const { data, error } = await supabase
        .from('points')
        .select('total_points')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching total points:', error.message);
        return;
      }

      if (data && data.total_points !== undefined) {
        setTotalPoints(data.total_points);
      } else {
        setTotalPoints(null);
      }
    };
      loadUserInfo();
    }, [])
  );

  const handlePickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your media library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const image = result.assets[0];
      const userId = user?.id;
      if (!userId) throw new Error('User not authenticated');

      const uri = image.uri;
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';

      let contentType = 'application/octet-stream';
      if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const fileName = `${userId}.${ext}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, uint8Array, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');

      setImageUri(`${publicUrl}?v=${Date.now()}`);

      const updatedProfile = { ...user, avatar_url: publicUrl };
      setUser(updatedProfile);
      await AsyncStorage.setItem('userInfo', JSON.stringify(updatedProfile));

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: publicUrl,
        });

      if (dbError) throw dbError;
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
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={handlePickAndUploadImage}>
        <Image
          source={imageUri ? { uri: imageUri } : DefaultProfileImage}
          style={styles.profileImage}
        />
      </TouchableOpacity>

      {user ? (
        <>
          <Text style={styles.username}>Welcome {user.username}!</Text>
          <Text style={styles.email}>{user.email}</Text>

          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>Weekly Insights</Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>
                ⭐ Total Points: {totalPoints !== null ? totalPoints : 'No data yet'}
              </Text>
              <Text style={styles.placeholderText}>
                😴 Sleep: {avgSleep !== null ? `${avgSleep.toFixed(2)} hrs/day` : 'No data yet'}
              </Text>
              <Text style={styles.placeholderNote}>Based on your latest activity data.</Text>
            </View>
          </View>

          <View style={styles.badgesContainer}>
            <Text style={styles.sectionTitle}>Badges Earned</Text>
            <Badges badgeKeys={(user.badges || [])} /> 
          </View>

          
          <TouchableOpacity
            style={[styles.button, { marginBottom: 15 }]}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.buttonText}>Go to Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.loadingText}>Loading profile...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    marginBottom: 5,
  },
  email: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
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
    backgroundColor: '#fff',
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
  badgesContainer: {
    width: '100%',
    marginBottom: 30,
    alignItems: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  badgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e6ab0',
    textTransform: 'capitalize',
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