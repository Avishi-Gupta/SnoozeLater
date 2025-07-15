import SleepBarChart from '@/components/SleepBarChart';
import { supabase } from '@/lib/supabase';
import { endOfWeek, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

    const durations = data.map((d) => d.duration_slept);
    const totalSleep = durations.reduce((sum, val) => sum + val, 0);
    const average = totalSleep / data.length;
    setAverageSleep(average);

    const mean = average;
    const variance =
      durations.reduce((sum, val) => sum + (val - mean) ** 2, 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    const lateNights = data.filter((d) => {
      const hour = new Date(d.sleep_time).getHours();
      return hour >= 1;
    }).length;

    const suggestions: string[] = [];

    if (average >= 9.5) {
      suggestions.push("You're averaging a lot of sleep — make sure it isn't affecting your alertness during the day.");
    } else if (average >= 8) {
      suggestions.push("Great job! You're getting optimal rest.");
    } else if (average >= 6.5) {
      suggestions.push("You're getting some rest, but could benefit from 1–2 more hours of sleep.");
    } else {
      suggestions.push("You're not sleeping enough. Aim for 7–9 hours nightly.");
    }

    if (stdDev > 1.5) {
      suggestions.push("Your sleep duration varies a lot. Try to keep a consistent sleep schedule.");
    }

    if (lateNights >= 3) {
      suggestions.push("You're sleeping quite late on several nights. Earlier sleep can improve rest quality.");
    }

    if (data.length >= 7) {
      suggestions.push("Well done logging a full week of data. Keep it up!");
    }

    setSuggestion(suggestions.join(' '));
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

      {sleepData.length > 0 && (
        <View style={{ width: '100%', marginTop: 10 }}>
          {sleepData.map((item, index) => {
            const date = new Date(item.inserted_at).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            return (
              <View key={index} style={styles.card}>
                <Text style={styles.title}>{date}</Text>
                <Text style={styles.text}>Slept: {item.duration_slept.toFixed(2)} hrs</Text>
                <Text style={styles.text}>Sleep Time: {new Date(item.sleep_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={styles.text}>Wake Time: {new Date(item.wake_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.chartTitle}>Sleep Duration Over the Week</Text>
      <SleepBarChart data={sleepData} />

      <Text style={styles.suggestionHeader}>Weekly Suggestion</Text>

      <View style={styles.suggestionBox}>
        <Text style={styles.suggestionText}>{suggestion}</Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push('../TaskInsights')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>View Task Insights →</Text>
      </TouchableOpacity>
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
    marginBottom: 8,
  },
  noData: {
    fontStyle: 'italic',
    paddingTop: 5,
    fontSize: 16,
    color: '#00d',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4e6ab0',
    marginBottom: 6,
  },
  text: {
    fontSize: 14,
    color: '#333',
  },
  chartTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
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
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
    width: '100%',
  },
  suggestionText: {
    fontSize: 15,
    color: '#444',
    fontStyle: 'italic',
  },
  button: {
    marginTop: 30,
    backgroundColor: '#4e6ab0',
    padding: 12,
    borderRadius: 10,
    width: '60%',
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});