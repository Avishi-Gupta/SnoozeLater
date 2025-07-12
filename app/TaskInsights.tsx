import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TaskStats = {
  category: string;
  count: number;
  avgPunctuality: number;
  totalPoints: number;
  totalTime: number;
  totalTimeHrs?: number;
};

export default function TaskInsights() {
  const [stats, setStats] = useState<TaskStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchTaskInsights();
  }, []);

  useEffect(() => {
  const fetchCompletedTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks_completed')
      .select('category, scheduled_time, completed_time, punctuality_mins')
      .eq('user_id', user.id);

    if (!error && data) {
      generateSuggestions(data);
    }
  };

  fetchCompletedTasks();
}, []);

  async function fetchTaskInsights() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks_completed')
      .select('category, punctuality_mins, points_earned, time_spent_secs')
      .eq('user_id', user.id);

    if (error || !data) {
      console.error('Error fetching task insights:', error?.message);
      setLoading(false);
      return;
    }

    const grouped: Record<string, TaskStats> = {};

    for (const task of data) {
      const category = task.category ?? 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = {
          category,
          count: 0,
          avgPunctuality: 0,
          totalPoints: 0,
          totalTime: 0,
        };
      }

      grouped[category].count += 1;
      grouped[category].avgPunctuality += task.punctuality_mins;
      grouped[category].totalPoints += task.points_earned;
      grouped[category].totalTime += task.time_spent_secs ?? 0;
    }
    

    const finalStats = Object.values(grouped).map((entry) => ({
      ...entry,
      avgPunctuality: entry.avgPunctuality / entry.count,
      totalTimeHrs: Math.floor(entry.totalTime / 3600),
    }));

    setStats(finalStats);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  type TaskCompleted = {
  category: string;
  scheduled_time: string;
  completed_time: string;
  punctuality_mins: number;
};

function generateSuggestions(data: TaskCompleted[]) {
  const categoryCount: Record<string, number> = {};
  let eveningCount = 0;
  let totalTasks = data.length;
  let lateTasks = 0;

  data.forEach((task) => {
    const category = task.category;
    categoryCount[category] = (categoryCount[category] || 0) + 1;

    const completedHour = new Date(task.completed_time).getHours();
    if (completedHour >= 18) eveningCount++;

    if (task.punctuality_mins > 15) lateTasks++;
  });

  const suggestionsList: string[] = [];

  // 1. Category Balance
  const assignment = categoryCount['Assignment'] || 0;
  const selfStudy = categoryCount['Self-Study'] || 0;
  if (assignment > selfStudy + 2) {
    suggestionsList.push("You're focusing more on Assignments. Try to balance with some Self-Study.");
  }

  // 2. Evening Focus Pattern
  if (eveningCount / totalTasks > 0.6) {
    suggestionsList.push("You complete most tasks in the evening. Consider doing tougher tasks earlier.");
  }

  // 3. Punctuality
  if (lateTasks / totalTasks > 0.5) {
    suggestionsList.push("You often start tasks late. Try to begin within 5 minutes of the reminder.");
  }

  if (totalTasks >= 10) {
    suggestionsList.push("You've completed many tasks this week. Remember to rest or reward yourself!");
  }

  setSuggestions(suggestionsList);
}



  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Task Insights</Text>
      {stats.length === 0 ? (
        <Text style={styles.noData}>No completed tasks yet.</Text>
      ) : (
        stats.map((s) => (
          <View key={s.category} style={styles.card}>
            <Text style={styles.title}>{s.category}</Text>
            <Text style={styles.text}>Tasks Completed: {s.count}</Text>
            <Text style={styles.text}>
              Avg Punctuality: {s.avgPunctuality.toFixed(1)} min(s)
            </Text>
            <Text style={styles.text}>Points Earned: {s.totalPoints}</Text>
            <Text style={styles.text}>Time Spent: {s.totalTimeHrs} hr(s)</Text>
          </View>
        ))
      )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#4e6ab0', margin: 30 }]}
              onPress={() => router.replace('./Dashboard/WeeklyInsights')}
            >
              <Text style={styles.buttonText}>Back to Sleep Insights</Text>
            </TouchableOpacity>
            {suggestions.length > 0 && (

  <View style={styles.suggestionBox}>
    <Text style={styles.suggestionHeader}>Smart Suggestions</Text>
    {suggestions.map((s, i) => (
      <Text key={i} style={styles.suggestionItem}>• {s}</Text>
    ))}
  </View>
)}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#816ec7',
    padding: 30,
    flex: 1,
  },
  centered: {
    flex: 1,
    backgroundColor: '#816ec7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    marginTop: 30,
  },
  noData: {
    fontStyle: 'italic',
    color: '#fff',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#35d',
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: '#222',
  },
    button: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 10,
    width: '60%',
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  suggestionBox: {
  marginTop: 20,
  padding: 15,
  backgroundColor: '#f0f4ff',
  borderRadius: 10,
  width: '100%',
},
suggestionHeader: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
  color: '#333',
},
suggestionItem: {
  fontSize: 15,
  color: '#444',
  marginBottom: 5,
},

});
