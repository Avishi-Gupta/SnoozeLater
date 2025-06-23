import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

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
  if (userError || !user) return;

  const { data: top, error: topError } = await supabase
    .from('points')
    .select('user_id, total_points')
    .order('total_points', { ascending: false })
    .limit(10);


  let top10: any[] = [];
  if (!topError) {
    top10 = await Promise.all(
      top.map(async (item: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', item.user_id)
          .single();
        return {
          id: item.user_id,
          name: item.user_id === user.id ? `${profile?.username || 'Unknown'} (You)` : profile?.username || 'Unknown',
          points: item.total_points,
        };
      })
    );
    setTopUsers(top10);
  }

  const { data: allUsers } = await supabase
    .from('points')
    .select('user_id, total_points')
    .order('total_points', { ascending: false });

  const rank = allUsers?.findIndex((u: any) => u.user_id === user.id);
  if (rank !== undefined && rank !== -1) {
    setUserRank(rank + 1);
  }

  const myEntry = allUsers?.find((u: any) => u.user_id === user.id);
  if (myEntry) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    setCurrentUser({
      id: user.id,
      points: myEntry.total_points,
      name: 'You',
    });
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

      <FlatList
        data={topUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.item}>
            <Text style={styles.rank}>{index + 1}.</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.points}>{item.points} points</Text>
          </View>
        )}
      />

{currentUser && userRank !== null && (
  <>
    <View style={{ height: 10 }} />
    <Text style={{ color: 'white', marginTop: 12, marginBottom: 4 }}>
      Your Rank
    </Text>
    <View style={[styles.item, styles.userRow]} key="your-rank-row">
      <Text style={styles.rank}>{userRank}.</Text>
      <Text style={styles.name}>{currentUser.name}</Text>
      <Text style={styles.points}>{currentUser.points} pts</Text>
    </View>
  </>
)}
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20, backgroundColor: '#816ec7' },
  title: { fontSize: 24, marginBottom: 20, color: 'white' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 1,
  },
  rank: {
    fontSize: 18,
    width: 30,
  },
  name: {
    fontSize: 18,
    flex: 1,
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRow: {
  backgroundColor: '#ffe082',
},
});