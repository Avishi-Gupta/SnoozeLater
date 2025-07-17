import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
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
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${userId})`)
      .single();

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
      <Text style={[styles.title, { marginTop: 20 }]}>Social</Text>

      <TextInput
        style={styles.input}
        placeholder="Add friend by username/email"
        value={friendInput}
        onChangeText={setFriendInput}
        placeholderTextColor="#999"
        autoCapitalize="none"
      />
      <Button title="Send Friend Request" onPress={handleAddFriend} />

      <View style={{ marginTop: 16 }}>
        <Button title="Go to Friends" onPress={() => router.push('/FriendsPage')} />
        <View style={{ height: 10 }} />
        <Button title="Go to Requests" onPress={() => router.push('/RequestsPage')} />
      </View>

      <Text style={styles.sectionTitle}>Friend Activity</Text>
      <FlatList
        data={activityFeed}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {renderAvatar(item.profiles?.avatar_url)}
            <View>
              <Text style={styles.text}>
                <Text style={{ fontWeight: 'bold' }}>{item.profiles?.username}</Text>: {item.message}
              </Text>
              <Text style={{ fontSize: 12, color: '#999' }}>{new Date(item.created_at).toLocaleString()}</Text>
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
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: 'white',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 8,
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 6,
    borderRadius: 6,
    elevation: 1,
  },
  text: { fontSize: 16, marginLeft: 10, color: '#000', flex: 1 },
  empty: { textAlign: 'center', color: '#ddd', marginVertical: 10 },
  button: {
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
});