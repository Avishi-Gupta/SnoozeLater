import SleepBarChart from '@/components/SleepBarChart';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

type SleepLog = {
  created_at: string;
  points: number;
  duration_slept: number;
};

export default function WeeklyInsights() {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [averageSleep, setAverageSleep] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [weeklySuggestion, setWeeklySuggestion] = useState('');

  useEffect(() => {
    fetchWeeklyInsights();
  }, []);

  const fetchWeeklyInsights = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.id) {
      console.error('Invalid user:', userError);
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // past 7 days

    const { data, error } = await supabase
      .from('points_log')
      .select('created_at, points, duration_slept')
      .eq('user_id', user.id)
      .eq('type', 'sleep')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching insights:', error.message);
      return;
    }

    if (data && data.length > 0) {
      setLogs(data);

      const totalSleep = data.reduce((sum, row) => sum + (row.duration_slept || 0), 0);
      const totalPts = data.reduce((sum, row) => sum + row.points, 0);

      const avgSleep = totalSleep / data.length;
      setAverageSleep(avgSleep);
      setTotalPoints(totalPts);

      let suggestion = '';
      if (avgSleep < 6) {
        suggestion = "😴 You're not getting enough sleep. Aim for 7–8 hours per night for better focus and recovery.";
      } else if (avgSleep < 7.5) {
        suggestion = "⏰ You're close! Try winding down a bit earlier to hit that 7.5-hour mark.";
      } else if (avgSleep <= 9) {
        suggestion = "🌟 Great job! Your sleep duration is right where it should be.";
      } else {
        suggestion = "🛌 You might be oversleeping. Try to maintain a consistent routine.";
      }

      setWeeklySuggestion(suggestion);
    } else {
      setLogs([]);
      setAverageSleep(0);
      setTotalPoints(0);
      setWeeklySuggestion('');
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🗓 Weekly Insights</Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>🛏 Avg Sleep</Text>
          <Text style={styles.summaryValue}>{averageSleep.toFixed(2)} hrs</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>⭐ Total Points</Text>
          <Text style={styles.summaryValue}>{totalPoints}</Text>
        </View>
      </View>

      <View style={styles.suggestionCard}>
        <Text style={styles.suggestionTitle}>Weekly Suggestion</Text>
        <Text style={styles.suggestionText}>
          {weeklySuggestion || 'Not enough data yet. Try logging your sleep this week!'}
          </Text>
          </View>

          {logs.length > 0 && (
          <SleepBarChart
          data={logs.map((entry) => ({
            date: new Date(entry.created_at).toDateString().slice(4, 10),
            hours: entry.duration_slept,
          }))}
          />)}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.created_at}
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            <View style={styles.logDetails}>
              <Text style={styles.detail}>
                Sleep: <Text style={styles.detailValue}>{item.duration_slept.toFixed(2)} hrs</Text>
              </Text>
              <Text style={styles.detail}>
                Points: <Text style={styles.detailValue}>{item.points}</Text>
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.noData}>No data in the past 7 days.</Text>
        }
        contentContainerStyle={logs.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#816ec7',
    paddingHorizontal: 20,
    paddingTop: 70,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#ffe082',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  suggestionCard: {
    backgroundColor: '#e6f0ff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  suggestionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#204080',
    marginBottom: 10,
  },
  suggestionText: {
    fontSize: 16,
    color: '#204080',
    lineHeight: 22,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  date: {
    fontWeight: '700',
    color: '#333',
    fontSize: 16,
    marginBottom: 10,
  },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detail: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontWeight: '600',
    color: '#000',
  },
  noData: {
    color: '#eee',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});