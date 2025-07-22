import { supabase } from '@/lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

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
  const [taskPoints, setTaskPoints] = useState<number | null>(null);
  const [avgPunctualityOverall, setAvgPunctualityOverall] = useState<number | null>(null);
const [avgTimeSpent, setAvgTimeSpent] = useState<number | null>(null);
const [punctualityByHour, setPunctualityByHour] = useState<number[]>([]);
const [punctualityByTimeOfDay, setPunctualityByTimeOfDay] = useState<number[]>([]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  useFocusEffect(
    useCallback(() => {
      fetchTaskInsights();
        fetchPoints();
  }, [])
);


useFocusEffect(
  useCallback(() => {
  const fetchCompletedTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks_completed')
      .select('category, scheduled_time, completed_time, punctuality_mins')
      .eq('user_id', user.id)
      .gte('completed_time', sevenDaysAgo.toISOString());

    if (!error && data) {
      generateSuggestions(data);
    }
  };

  fetchCompletedTasks();
}, []));

async function fetchPoints() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    console.error('Error fetching user:', userError?.message);
    return;
  }

  const userId = userData.user.id;

  const { data, error } = await supabase
    .from('points')
    .select('task_points')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching task points:', error.message);
  } else {
    setTaskPoints(data.task_points);
  }
}
  async function fetchTaskInsights() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks_completed')
      .select('category, punctuality_mins, points_earned, time_spent_secs, scheduled_time, completed_time')
      .eq('user_id', user.id)
      .gte('completed_time', sevenDaysAgo.toISOString());

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

     
      let totalTaskCount = data.length;
      const timeOfDayBuckets: { [key: string]: number[] } = {
        Morning: [],
        Afternoon: [],
        Evening: [],
        Night: [],
        };

    let totalPunctuality = 0;
    let totalFocusTime = 0;
    for (const task of data) {
    const hour = new Date(task.scheduled_time).getHours();
    if (hour >= 5 && hour <= 11) {
        timeOfDayBuckets.Morning.push(task.punctuality_mins);
    } else if (hour >= 12 && hour <= 16) {
        timeOfDayBuckets.Afternoon.push(task.punctuality_mins);
    } else if (hour >= 17 && hour <= 20) {
        timeOfDayBuckets.Evening.push(task.punctuality_mins);
    } else {
        timeOfDayBuckets.Night.push(task.punctuality_mins);
    }

    totalPunctuality += task.punctuality_mins;
    totalFocusTime += task.time_spent_secs ?? 0;
    }
    const avgByTimeOfDay = ['Morning', 'Afternoon', 'Evening', 'Night'].map((label) => {
    const values = timeOfDayBuckets[label];
    return values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0;
    });
setPunctualityByTimeOfDay(avgByTimeOfDay);
setAvgTimeSpent(totalFocusTime / totalTaskCount / 3600);
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
    if (completedHour >= 20) eveningCount++;

    if (task.punctuality_mins > 20) lateTasks++;
  });

  const suggestionsList: string[] = [];

  // 1. Category Balance
  const assignment = categoryCount['Assignment'] || 0;
  const selfStudy = categoryCount['Self-Study'] || 0;
  if (assignment > selfStudy + 5) {
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

    if (avgPunctualityOverall !== null && avgPunctualityOverall > 20) {
    suggestionsList.push("Your average punctuality is low. Try starting closer to the scheduled time.");
    }

    if (avgTimeSpent !== null && avgTimeSpent < 2) {
      suggestionsList.push("You spend less than 2 hours per task on average. Consider dedicating more time.");
    }


  setSuggestions(suggestionsList);
}

const pieData = stats.map((s, i) => ({
  name: s.category,
  population: s.count,
  color: ['#ffa600', '#bc5090', '#003f5c', '#58508d'][i % 4], // feel free to expand
  legendFontColor: '#fff',
  legendFontSize: 12,
}));

const chartLabels = stats.map((s) => s.category);
const chartTaskCounts = stats.map((s) => s.count);
const chartFocusTimeHours = stats.map((s) => +(s.totalTime / 3600).toFixed(1));

const chartConfig = {
    backgroundColor: '#1E2923',
    backgroundGradientFrom: '#4e6ab0',
    backgroundGradientTo: '#355077',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: () => '#fff',
    style: {
        borderRadius: 16,
    },
    propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: '#ffa726',
    },
    propsForLabels: {
        fontSize: 9, 
    },
};
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Task Insights</Text>
      <Text style={styles.stat}>
        Avg Time per Task: {avgTimeSpent !== null ? avgTimeSpent.toFixed(1) + ' hrs' : 'No data'}
    </Text>
      <Text style={styles.stat}>
        Task Points: {taskPoints !== null ? taskPoints : 'No data'}
      </Text>
        <View style={styles.suggestionBox}>
    <Text style={styles.suggestionHeader}>Weekly Suggestions</Text>
     {stats.length === 0 ? (
        <Text style={[styles.noData, { color: 'darkgray' }]}>No completed tasks yet.</Text>
      ) : (
        suggestions.map((s, i) => (
          <Text key={i} style={styles.suggestionItem}>• {s}</Text>
        ))
      )}
  </View>

                <Text style={styles.chartTitle}>Task Category Distribution</Text>
                 {stats.length === 0 ? (
        <Text style={styles.noData}>No completed tasks yet.</Text>
      ) : (
                    <PieChart
                    data={pieData}
                    width={Dimensions.get('window').width - 20}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                    />

      )}
                <Text style={styles.chartTitle}>Total Time Spent (hrs) per Category</Text>
                 {stats.length === 0 ? (
        <Text style={styles.noData}>No completed tasks yet.</Text>
      ) : (
                <LineChart
                data={{
                    labels: chartLabels,
                    datasets: [{ data: chartFocusTimeHours }],
                }}
                width={Dimensions.get('window').width - 20}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                />
              )}

                <Text style={styles.chartTitle}>Avg Punctuality by Time of Day</Text>
                 {stats.length === 0 ? (
        <Text style={styles.noData}>No completed tasks yet.</Text>
      ) : (
                    <BarChart
                    data={{
                        labels: ['Morning', 'Afternoon', 'Evening', 'Night'],
                        datasets: [{ data: punctualityByTimeOfDay }],
                    }}
                    width={Dimensions.get('window').width - 20}
                    height={220}
                    chartConfig={chartConfig}
                    yAxisLabel=""
                    yAxisSuffix=" min"
                    style={styles.chart}
                    />
                  )}

                          {stats.length === 0 ? (
        <Text style={styles.noData}></Text>
      ) : (

        stats.map((s) => (
          <View key={s.category} style={styles.card}>
            <Text style={styles.title}>{s.category}</Text>
            <Text style={styles.text}>Tasks Completed: {s.count}</Text>
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
    textAlign: 'center',
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
    marginBottom: 5,
    marginTop: 15,
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
    alignContent: 'center',
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
    marginBottom: 20,
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
  textAlign: 'center',
},
suggestionItem: {
  fontSize: 15,
  color: '#444',
  marginBottom: 5,
},
chart: {
  marginVertical: 8,
  borderRadius: 16,
  alignSelf: 'center',
},
chartTitle: {
  textAlign: 'center',
  fontSize: 16,
  fontWeight: 'bold',
  color: 'white',
  marginTop: 20,
},
  stat: {
    fontSize: 17,
    color: 'white',
    marginBottom: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
});

