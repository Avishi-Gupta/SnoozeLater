import { StyleSheet, Text, View } from 'react-native';
export default function WeeklyInsights() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Insights</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: '60', alignItems: 'center', backgroundColor: '#816ec7' },
  title: { fontSize: 24, marginBottom: 20 },
});