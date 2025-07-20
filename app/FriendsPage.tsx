import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Friend = {
  id: string;
  username: string;
  avatar_url?: string | null;
  unreadCount?: number;
};

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const navigation = useNavigation();
  useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    fetchFriends();
  });
  
  return unsubscribe;
}, [navigation]);

  async function fetchFriends() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      return;
    }

    const { data: friendRequests, error: frError } = await supabase
      .from('friend_requests')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (frError || !friendRequests) {
      setLoading(false);
      return;
    }

    const friendIds = new Set<string>();
    friendRequests.forEach((req) => {
      if (req.requester_id === user.id) friendIds.add(req.addressee_id);
      else if (req.addressee_id === user.id) friendIds.add(req.requester_id);
    });

    const idsArray = Array.from(friendIds);
    if (idsArray.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const { data: friendsData, error: friendsError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', idsArray);

    if (friendsError || !friendsData) {
      setLoading(false);
      return;
    }

    const { data: unreadMsgs } = await supabase
      .from('messages')
      .select('sender')
      .eq('receiver', user.id)
      .eq('read', false);

    const unreadCountMap: Record<string, number> = {};
    unreadMsgs?.forEach((msg) => {
      unreadCountMap[msg.sender] = (unreadCountMap[msg.sender] || 0) + 1;
    });

    const enrichedFriends = friendsData.map((f) => ({
      ...f,
      unreadCount: unreadCountMap[f.id] || 0,
    }));

    setFriends(enrichedFriends);
    setLoading(false);
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
      <View style={styles.header}>
        <Ionicons name="people-circle-outline" size={36} color="white" />
        <Text style={styles.title}>Your Friends</Text>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>
          Loading...
        </Text>
      ) : friends.length === 0 ? (
        <Text style={styles.empty}>No friends yet.</Text>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() =>
                router.push({
                  pathname: '/Chat',
                  params: {
                    friendId: item.id,
                    friendUsername: item.username,
                  },
                })
              }
            >
              <View style={styles.avatarContainer}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={{ color: '#fff' }}>?</Text>
                  </View>
                )}
                {typeof item.unreadCount === 'number' && item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.unreadCount > 9 ? '9+' : item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.name}>{item.username ?? ''}</Text>
                <Text style={styles.chatLabel}>Chat</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  loadingText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    flex: 1,
    color: '#222',
    fontWeight: '600',
  },
  empty: {
    color: 'white',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 18,
    fontStyle: 'italic',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'red',
    borderRadius: 14,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
  flex: 1,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingLeft: 10,
  paddingRight: 10,
},

chatLabel: {
  color: '#ccc',
  fontSize: 14,
  fontStyle: 'italic',
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