import { FlatList, StyleSheet, Text, View } from 'react-native';

const leaderboardData = [
  { id: '1', name: 'Alice', points: 150 },
  { id: '2', name: 'Bob', points: 130 },
  { id: '3', name: 'Charlie', points: 120 },
  { id: '4', name: 'Diana', points: 110 },
  { id: '5', name: 'Ethan', points: 100 },
  { id: '6', name: 'Avishi', points: 100 },
];

export default function Leaderboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <FlatList
        data={leaderboardData}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.item}>
            <Text style={styles.rank}>{index + 1}.</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.points}>{item.points} pts</Text>
          </View>
        )}
      />
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
});