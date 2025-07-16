import { supabase } from '@/lib/supabase';
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
};

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchFriends();
  }, []);

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

    if (friendIds.size === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const { data: friendsData, error: friendsError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', Array.from(friendIds));

    if (friendsError || !friendsData) {
      setLoading(false);
      return;
    }

    setFriends(friendsData);
    setLoading(false);
  }

  const renderAvatar = (avatar_url?: string | null) => {
    if (avatar_url) {
      return <Image source={{ uri: avatar_url }} style={styles.avatar} />;
    }
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Text style={{ color: '#fff' }}>?</Text>
      </View>
    );
  };

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
              {renderAvatar(item.avatar_url)}
              <Text style={styles.name}>{item.username}</Text>
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
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 4,
    marginRight: 8,
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
  },
  empty: {
    textAlign: 'center',
    color: 'white',
    marginTop: 20,
  },
});