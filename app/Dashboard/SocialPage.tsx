import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type UserProfile = {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
};

type FriendRequest = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  requester: UserProfile | null;
  addressee: UserProfile | null;
};

type Friend = {
  id: string;
  username: string;
  avatar_url?: string | null;
};

export default function SocialPage() {
  const [userId, setUserId] = useState<string>('');
  const [friendInput, setFriendInput] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    fetchUserAndData();
  }, []);

  async function fetchUserAndData() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Error fetching user:', error);
      return;
    }

    if (!user) {
      console.log('No user logged in');
      return;
    }

    setUserId(user.id);

    // Fetch friend requests and friends
    await fetchFriendRequests(user.id);
    await fetchFriends(user.id);
  }

  async function fetchFriendRequests(uid: string) {
    if (!uid) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        requester:profiles!friend_requests_requester_id_fkey (
          id,
          username,
          email,
          avatar_url
        ),
        addressee:profiles!friend_requests_addressee_id_fkey (
          id,
          username,
          email,
          avatar_url
        )
      `)
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching friend requests:', error);
      return;
    }

    if (!data) {
      console.log('No friend requests found');
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }

    console.log('Friend requests raw data:', data);

    // Normalize requester and addressee (they come as arrays)
    const normalizedData: FriendRequest[] = data.map((req: any) => ({
      ...req,
      requester: Array.isArray(req.requester) ? req.requester[0] : req.requester || null,
      addressee: Array.isArray(req.addressee) ? req.addressee[0] : req.addressee || null,
    }));

    const incoming = normalizedData.filter(
      (req) => req.addressee_id === uid && req.status === 'pending'
    );
    const outgoing = normalizedData.filter(
      (req) => req.requester_id === uid && req.status === 'pending'
    );

    console.log('Incoming requests:', incoming);
    console.log('Outgoing requests:', outgoing);

    setIncomingRequests(incoming);
    setOutgoingRequests(outgoing);
  }

  async function fetchFriends(uid: string) {
    if (!uid) return;

    // Fetch all friend requests where status = accepted and user is either requester or addressee
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        requester:profiles!friend_requests_requester_id_fkey (id, username, avatar_url),
        addressee:profiles!friend_requests_addressee_id_fkey (id, username, avatar_url)
      `)
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
      return;
    }

    if (!data) {
      setFriends([]);
      return;
    }

    // Map accepted friends to Friend[] array
    const friendList: Friend[] = data.map((req: any) => {
      const isRequester = req.requester_id === uid;
      const friendProfile = isRequester
        ? (Array.isArray(req.addressee) ? req.addressee[0] : req.addressee)
        : (Array.isArray(req.requester) ? req.requester[0] : req.requester);

      return {
        id: friendProfile?.id || 'unknown',
        username: friendProfile?.username || 'Unknown',
        avatar_url: friendProfile?.avatar_url || null,
      };
    });

    setFriends(friendList);
  }

  async function handleAddFriend() {
    const input = friendInput.trim();
    if (!input || !userId) return;

    // Find user by username or email
    const { data: targetUser, error } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or(`username.eq.${input},email.eq.${input}`)
      .single();

    if (error || !targetUser) {
      Alert.alert('User not found');
      return;
    }

    if (targetUser.id === userId) {
      Alert.alert('You cannot add yourself');
      return;
    }

    // Check if friend request or friendship already exists
    const { data: existing, error: existingErr } = await supabase
      .from('friend_requests')
      .select('id')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${userId})`)
      .single();

    if (existingErr) {
      console.error('Error checking existing requests:', existingErr);
      Alert.alert('Failed to check existing requests');
      return;
    }

    if (existing) {
      Alert.alert('Friend request already exists or you are already friends');
      return;
    }

    // Insert new friend request
    const { error: insertErr } = await supabase.from('friend_requests').insert({
      requester_id: userId,
      addressee_id: targetUser.id,
      status: 'pending',
    });

    if (insertErr) {
      Alert.alert('Failed to send friend request');
      console.error('Insert error:', insertErr);
      return;
    }

    Alert.alert('Friend request sent!');
    setFriendInput('');
    fetchFriendRequests(userId);
  }

  async function handleRespond(id: string, action: 'accepted' | 'rejected') {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: action, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      Alert.alert('Failed to update friend request');
      console.error('Update error:', error);
      return;
    }

    fetchFriends(userId);
    fetchFriendRequests(userId);
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
      <Text style={styles.title}>Social</Text>

      <TextInput
        style={styles.input}
        placeholder="Add friend by username/email"
        value={friendInput}
        onChangeText={setFriendInput}
        placeholderTextColor="#999"
        autoCapitalize="none"
      />
      <Button title="Send Friend Request" onPress={handleAddFriend} />

      <Text style={styles.sectionTitle}>Your Friends</Text>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {renderAvatar(item.avatar_url)}
            <Text style={styles.text}>{item.username}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No friends yet.</Text>}
      />

      <Text style={styles.sectionTitle}>Incoming Requests</Text>
      <FlatList
        data={incomingRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {renderAvatar(item.requester?.avatar_url)}
            <Text style={styles.text}>{item.requester?.username || 'Unknown'}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => handleRespond(item.id, 'accepted')}>
                <Text style={[styles.button, { backgroundColor: 'green' }]}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRespond(item.id, 'rejected')}>
                <Text style={[styles.button, { backgroundColor: 'crimson' }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No incoming requests.</Text>}
      />

      <Text style={styles.sectionTitle}>Outgoing Requests</Text>
      <FlatList
        data={outgoingRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {renderAvatar(item.addressee?.avatar_url)}
            <Text style={styles.text}>To: {item.addressee?.username || 'Unknown'}</Text>
            <Text style={{ color: '#999' }}>Pending...</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No outgoing requests.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#816ec7',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    marginTop: 24,
    marginBottom: 8,
    color: 'white',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { fontSize: 16, flex: 1, marginHorizontal: 8 },
  button: {
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    textAlign: 'center',
    marginLeft: 8,
  },
  empty: {
    color: 'white',
    fontStyle: 'italic',
    marginTop: 5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
});