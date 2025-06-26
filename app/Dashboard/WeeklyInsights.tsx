import SleepBarChart from '@/components/SleepBarChart';
import { supabase } from '@/lib/supabase';
import { endOfWeek, startOfWeek } from 'date-fns';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

type SleepData = {
  sleep_time: string;
  wake_time: string;
  duration_slept: number;
  inserted_at: string;
};

export default function WeeklyInsights() {
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageSleep, setAverageSleep] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<string>('');

  useEffect(() => {
    fetchSleepData();
  }, []);

  async function fetchSleepData() {
    setLoading(true);

    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });

    const { data, error } = await supabase
      .from('sleep_data')
      .select('sleep_time, wake_time, duration_slept, inserted_at')
      .gte('inserted_at', start.toISOString())
      .lte('inserted_at', end.toISOString())
      .order('inserted_at', { ascending: true });

    if (error) {
      console.error('Error fetching sleep data:', error.message);
    } else {
      setSleepData(data);
      calculateStats(data);
    }

    setLoading(false);
  }

  function calculateStats(data: SleepData[]) {
    if (data.length === 0) {
      setAverageSleep(null);
      setSuggestion('No data available for this week.');
      return;
    }

    const totalSleep = data.reduce((sum, item) => sum + item.duration_slept, 0);
    const average = totalSleep / data.length;
    setAverageSleep(average);

    if (average >= 8) {
      setSuggestion('Great job! You’re getting enough rest. Keep it up!');
    } else if (average >= 6) {
      setSuggestion('You’re doing okay, but try to get a bit more sleep.');
    } else {
      setSuggestion('You need more rest. Try adjusting your sleep schedule.');
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#816ec7' }}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.header}>Weekly Insights</Text>

      {averageSleep !== null ? (
        <Text style={styles.stat}>
          Average Daily Sleep: {averageSleep.toFixed(2)} hrs
        </Text>
      ) : (
        <Text style={styles.noData}>Average Daily Sleep: No data</Text>
      )}

      <SleepBarChart data={sleepData} />

      <Text style={styles.suggestionHeader}>Weekly Suggestion</Text>

      <View style={styles.suggestionBox}>
        <Text style={styles.suggestionText}>{suggestion}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#816ec7',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    paddingBottom: 90,
  },
  centered: {
    flex: 1,
    backgroundColor: '#816ec7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  stat: {
    fontSize: 16,
    color: 'white',
    marginBottom: 2,
  },
  noData: {
    fontStyle: 'italic',
    paddingTop: 5,
    fontSize: 16,
    color: '#00d',
    marginBottom: 10,
  },
  suggestionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 24,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  suggestionBox: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  suggestionText: {
    fontSize: 15,
    color: '#35d',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});