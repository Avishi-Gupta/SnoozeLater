import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type UserProfile = {
  id: string;
  username: string;
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

export default function RequestsPage() {
  const [userId, setUserId] = useState<string>('');
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    getUserAndRequests();
  }, []);

  async function getUserAndRequests() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      Alert.alert('Failed to fetch user');
      return;
    }

    setUserId(user.id);
    fetchRequests(user.id);
  }

  async function fetchRequests(uid: string) {
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
          avatar_url
        ),
        addressee:profiles!friend_requests_addressee_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch friend requests:', error);
      Alert.alert('Failed to fetch friend requests');
      return;
    }

    if (!data) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }

    const normalized: FriendRequest[] = data.map((req: any) => ({
      ...req,
      requester: Array.isArray(req.requester) ? req.requester[0] : req.requester || null,
      addressee: Array.isArray(req.addressee) ? req.addressee[0] : req.addressee || null,
    }));

    setIncomingRequests(
      normalized.filter((req) => req.addressee_id === uid && req.status === 'pending')
    );
    setOutgoingRequests(
      normalized.filter((req) => req.requester_id === uid && req.status === 'pending')
    );
  }

  async function handleRespond(id: string, action: 'accepted' | 'rejected') {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: action, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      Alert.alert('Failed to update friend request');
      return;
    }

    if (userId) fetchRequests(userId);
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
              <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      <Text style={styles.title}>Friend Requests</Text>

      <Text style={styles.sectionTitle}>Incoming Requests</Text>
      <FlatList
        data={incomingRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {renderAvatar(item.requester?.avatar_url)}
            <Text style={styles.text}>{item.requester?.username || 'Unknown'}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: 'green' }]}
                onPress={() => handleRespond(item.id, 'accepted')}
              >
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: 'crimson' }]}
                onPress={() => handleRespond(item.id, 'rejected')}
              >
                <Text style={styles.buttonText}>Reject</Text>
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
            <Text style={styles.pendingText}>Pending...</Text>
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
      marginBottom: 20,
      color: 'white',
      fontWeight: 'bold',
    },
    sectionTitle: {
      fontSize: 18,
      marginBottom: 10,
      color: 'white',
      fontWeight: '600',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: 12,
      marginVertical: 6,
      borderRadius: 8,
      elevation: 2,
    },
    text: {
      flex: 1,
      fontSize: 16,
      marginLeft: 12,
      color: '#333',
    },
    pendingText: {
      fontSize: 14,
      color: '#999',
      marginLeft: 10,
    },
    button: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      justifyContent: 'center',
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
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
    empty: {
      textAlign: 'center',
      color: '#ddd',
      marginVertical: 20,
      fontSize: 16,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      padding: 8,
    },

    backText: {
      color: 'white',
      fontSize: 16,
      marginLeft: 5,
    },
  });