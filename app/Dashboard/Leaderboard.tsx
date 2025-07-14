import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error fetching auth user:', userError);
      return;
    }

    const currentUserId = user.id;

    const { data: friendRequests, error: friendsError } = await supabase
      .from('friend_requests')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

    if (friendsError) {
      console.error('Error fetching friend_requests:', friendsError);
      return;
    }

    const friendIds = new Set<string>();
    friendRequests.forEach((req) => {
      if (req.requester_id === currentUserId) friendIds.add(req.addressee_id);
      else if (req.addressee_id === currentUserId) friendIds.add(req.requester_id);
    });
    friendIds.add(currentUserId);

    const { data: pointsData, error: pointsError } = await supabase
      .from('points')
      .select('user_id, total_points');

    if (pointsError || !pointsData) {
      console.error('Error fetching points:', pointsError);
      return;
    }

    let friendPoints = pointsData
      .filter((p) => friendIds.has(p.user_id))
      .sort((a, b) => b.total_points - a.total_points);

    const hasCurrentUser = friendPoints.some(p => p.user_id === currentUserId);
    if (!hasCurrentUser) {
      const { data: myPointsData } = await supabase
        .from('points')
        .select('user_id, total_points')
        .eq('user_id', currentUserId)
        .single();

      if (myPointsData) {
        friendPoints = [myPointsData, ...friendPoints];
      } else {
        friendPoints = [{ user_id: currentUserId, total_points: 0 }, ...friendPoints];
      }
    }

    const leaderboardWithProfiles = await Promise.all(
      friendPoints.slice(0, 10).map(async (entry) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', entry.user_id)
          .single();

        return {
          id: entry.user_id,
          name:
            entry.user_id === currentUserId
              ? `${profile?.username || 'Unknown'} (You)`
              : profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          points: entry.total_points,
        };
      })
    );

    setTopUsers(leaderboardWithProfiles);

    const rank = friendPoints.findIndex((p) => p.user_id === currentUserId);
    if (rank !== -1) setUserRank(rank + 1);

    const myEntry = friendPoints.find((p) => p.user_id === currentUserId);
    if (myEntry) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', currentUserId)
        .single();

      setCurrentUser({
        id: currentUserId,
        points: myEntry.total_points,
        name: profile?.username || 'You',
        avatar_url: profile?.avatar_url || null,
      });
    }
  };

  const getRankDisplay = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const getItemStyle = (index: number) => {
    if (index === 0) return styles.top1;
    if (index === 1) return styles.top2;
    if (index === 2) return styles.top3;
    return styles.item;
  };

  const renderAvatar = (url?: string | null) => {
    if (url) {
      return <Image source={{ uri: url }} style={styles.avatar} />;
    }
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Text style={{ color: '#fff' }}>?</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

      <FlatList
        data={topUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={getItemStyle(index)}>
            <Text style={styles.rank}>{getRankDisplay(index)}</Text>
            {renderAvatar(item.avatar_url)}
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.points}>{item.points} points</Text>
          </View>
        )}
      />

      {currentUser && userRank !== null && (
        <>
          <Text style={{ color: 'white', marginBottom: 4, fontSize: 16 }}>
            Your Rank
          </Text>
          <View style={[styles.item, styles.userRow]}>
            <Text style={styles.rank}>{userRank}.</Text>
            {renderAvatar(currentUser.avatar_url)}
            <Text style={styles.name}>{currentUser.name}</Text>
            <Text style={styles.points}>{currentUser.points} pts</Text>
          </View>
        </>
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
  top1: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffd700',
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
  },
  top2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c0c0c0',
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
  },
  top3: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#cd7f32',
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe082',
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
  },
  rank: {
    fontSize: 18,
    width: 40,
  },
  name: {
    fontSize: 18,
    flex: 1,
    marginLeft: 10,
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
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
});