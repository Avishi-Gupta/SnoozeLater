import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type Activity = {
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

export default function SocialPage() {
  const [userId, setUserId] = useState<string>('');
  const [friendInput, setFriendInput] = useState('');
  const [activityFeed, setActivityFeed] = useState<Activity[]>([]);

  useEffect(() => {
    fetchUserAndData();
  }, []);

  async function fetchUserAndData() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return;

    setUserId(user.id);
    await fetchActivityFeed(user.id);
  }

  async function fetchActivityFeed(uid: string) {
    const { data: friendRequests, error: friendErr } = await supabase
      .from('friend_requests')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

    if (friendErr || !friendRequests) return;

    const friendIds = new Set<string>();
    friendRequests.forEach((req) => {
      if (req.requester_id === uid) friendIds.add(req.addressee_id);
      else if (req.addressee_id === uid) friendIds.add(req.requester_id);
    });

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('user_id, message, created_at, profiles(username, avatar_url)')
      .in('user_id', [...friendIds])
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (actError || !activities) return;

    const normalizedActivities: Activity[] = (activities ?? []).map((item: any) => ({
      user_id: item.user_id,
      message: item.message,
      created_at: item.created_at,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles || null,
    }));

    setActivityFeed(normalizedActivities);
  }

  async function handleAddFriend() {
    const input = friendInput.trim();
    if (!input || !userId) return;
  
  
    const { data: targetUser, error } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or(`username.eq.${input},email.eq.${input}`)
      .maybeSingle();
  
    if (error || !targetUser) {
      Alert.alert('User not found');
      return;
    }
  
  
    if (targetUser.id === userId) {
      Alert.alert('You cannot add yourself');
      return;
    }
  
    const { data: existing, error: existingErr } = await supabase
      .from('friend_requests')
      .select('id')
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${userId})`
      )
      .maybeSingle();
  
    if (existingErr) {
      Alert.alert('Failed to check existing requests');
      return;
    }
  
    if (existing) {
      Alert.alert('Friend request already exists or you are already friends');
      return;
    }
  
    const { error: insertErr } = await supabase.from('friend_requests').insert({
      requester_id: userId,
      addressee_id: targetUser.id,
      status: 'pending',
    });
  
    if (insertErr) {
      Alert.alert('Failed to send friend request');
      return;
    }
  
    Alert.alert('Friend request sent!');
    setFriendInput('');
  }

  function renderAvatar(avatar_url?: string | null) {
    if (avatar_url) {
      return <Image source={{ uri: avatar_url }} style={styles.avatar} />;
    }
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Text style={{ color: '#fff' }}>?</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people-circle-outline" size={36} color="white" />
        <Text style={[styles.title, { marginLeft: 8 }]}>Social</Text>
      </View>

      <View style={styles.inputRow}>
        <Ionicons name="person-add-outline" size={24} color="#444" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Add friend by username/email"
          value={friendInput}
          onChangeText={setFriendInput}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
          <Ionicons name="send-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/FriendsPage')}
        >
          <MaterialIcons name="group" size={20} color="white" />
          <Text style={styles.navButtonText}>Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/RequestsPage')}
        >
          <Ionicons name="mail-unread-outline" size={20} color="white" />
          <Text style={styles.navButtonText}>Requests</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Friend Activity</Text>
      <FlatList
        data={activityFeed}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {renderAvatar(item.profiles?.avatar_url)}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.activityText}>
                <Text style={{ fontWeight: 'bold' }}>{item.profiles?.username}</Text>: {item.message}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="time-outline" size={12} color="#999" />
                <Text style={[styles.activityTime, { marginLeft: 4 }]}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No recent activity.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#816ec7' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 20 },
  title: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#5a4fcf',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5a4fcf',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
  },
  navButtonText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 10,
    color: 'white',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 16,
    color: '#222',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  empty: {
    color: '#ddd',
    textAlign: 'center',
    marginTop: 20,
  },
});