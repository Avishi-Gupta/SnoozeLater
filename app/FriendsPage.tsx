import { supabase } from '@/lib/supabase';
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
      <Text style={styles.title}>Your Friends</Text>

      {loading ? (
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 20 }}>
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
              {/* Avatar + Badge container */}
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

              {/* Friend Name */}
              <Text style={styles.name}>{item.username ?? ''}</Text>
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
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    backgroundColor: '#aaa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    flex: 1,
    color: '#000',
  },
  empty: {
    textAlign: 'center',
    color: 'white',
    marginTop: 20,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});