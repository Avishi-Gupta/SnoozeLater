import { StyleSheet, Text, View } from 'react-native';
export default function WeeklyInsights() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Insights</Text>
      <Text style={styles.text}>Personalised insights will be shown here based on tracked number of sleep hours and compliance to routine </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 60, alignItems: 'center', backgroundColor: '#816ec7' },
  title: { fontSize: 24, marginBottom: 20,  color: 'white' },
  text:  { fontSize: 16, marginBottom: 20,  color: 'white' }
});