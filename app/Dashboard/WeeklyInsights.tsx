import SleepBarChart from '@/components/SleepBarChart';
import SleepPunctualityChart from '@/components/SleepPunctualityChart';
import { supabase } from '@/lib/supabase';
import { endOfWeek, startOfWeek } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SleepData = {
  sleep_time: string;
  wake_time: string;
  duration_slept: number;
  sleep_date: string;
  target_sleep_time: string;
  target_wake_time: string;
};

export default function WeeklyInsights() {
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageSleep, setAverageSleep] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<string>('');
  const [sleepPoints, setSleepPoints] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchSleepData();
      fetchSleepPoints();
    }, [])
  );

async function fetchSleepPoints() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    console.error('Error fetching user:', userError?.message);
    return;
  }

  const userId = userData.user.id;

  const { data, error } = await supabase
    .from('points')
    .select('sleep_points')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching sleep points:', error.message);
  } else {
    setSleepPoints(data.sleep_points);
  }
}
  async function fetchSleepData() {
    setLoading(true);

    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    console.error('Error fetching user:', userError?.message);
    return;
  }

  const userId = userData.user.id;
    const { data, error } = await supabase
      .from('sleep_data')
      .select('sleep_time, wake_time, duration_slept, sleep_date, target_sleep_time, target_wake_time')
      .eq('user_id', userId)
      .gte('sleep_date', start.toISOString().split('T')[0])
      .lte('sleep_date', end.toISOString().split('T')[0])
      .order('sleep_date', { ascending: true });

    if (error) {
      console.error('Error fetching sleep data:', error.message);
    } else {
      setSleepData(data);
      calculateStats(data);
    }

    setLoading(false);
  }

function calculateStats(data: SleepData[]) {
  const validData = data.filter(
    (d) =>
      d.duration_slept !== null &&
      d.sleep_time !== null &&
      d.wake_time !== null
  );

  if (validData.length === 0) {
    setAverageSleep(null);
    setSuggestion('No valid sleep data recorded for this week.');
    return;
  }

  const durations = validData.map((d) => d.duration_slept);
  const totalSleep = durations.reduce((sum, val) => sum + val, 0);
  const average = totalSleep / validData.length;
  setAverageSleep(average);

  const mean = average;
  const variance =
    durations.reduce((sum, val) => sum + (val - mean) ** 2, 0) / durations.length;
  const stdDev = Math.sqrt(variance);

  const lateNights = validData.filter((d) => {
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

    const punctuality = getPunctualityData(data);

    const lateSleeps = punctuality.filter(d => d && d.sleepDiff > 15).length;
    const earlyWakes = punctuality.filter(d => d && d.wakeDiff < -15).length;

    if (lateSleeps >= 3) {
      suggestions.push("You're going to sleep much later than your target on several days.");
    }

    if (earlyWakes >= 3) {
      suggestions.push("You're waking up earlier than planned often — are you getting interrupted sleep?");
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

  const latestEntry = sleepData[sleepData.length - 1];

  function copyTimeToDate(targetTime: Date, baseDate: Date) {
  const newDate = new Date(baseDate);
  newDate.setHours(targetTime.getHours(), targetTime.getMinutes(), 0, 0);
  return newDate;
}

function getPunctualityData(data: SleepData[]) {


  return data
    .filter(d =>
      d.sleep_time &&
      d.wake_time &&
      d.target_sleep_time &&
      d.target_wake_time
    )
    .map(d => {
      const actualSleep = new Date(d.sleep_time);
      const targetSleep = new Date(d.target_sleep_time);
      const actualWake = new Date(d.wake_time);
      const targetWake = new Date(d.target_wake_time);

      if (
        isNaN(actualSleep.getTime()) ||
        isNaN(targetSleep.getTime()) ||
        isNaN(actualWake.getTime()) ||
        isNaN(targetWake.getTime())
      ) {
        return null;
      }

      const alignedTargetSleep = copyTimeToDate(targetSleep, actualSleep);
      const alignedTargetWake = copyTimeToDate(targetWake, actualWake);

      const sleepDiff = Math.round((actualSleep.getTime() - alignedTargetSleep.getTime()) / 60000);
      const wakeDiff = Math.round((actualWake.getTime() - alignedTargetWake.getTime()) / 60000);

      const label = new Date(d.sleep_date).toLocaleDateString('en-US', { weekday: 'short' });

      return {
        date: label,
        sleepDiff,
        wakeDiff,
      };
    })
    .filter(d => d !== null && !isNaN(d.sleepDiff) && !isNaN(d.wakeDiff));
}


  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#816ec7' }}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.header}>Weekly Insights</Text>

      {averageSleep != null ? (
        <Text style={styles.stat}>
          Average Daily Sleep: {averageSleep.toFixed(2)} hrs
        </Text>
      ) : (
        <Text style={styles.stat}>Average Daily Sleep: No data</Text>
      )}
<Text style={styles.stat}>
  Sleep Points: {sleepPoints !== null ? sleepPoints : 'No data'}
</Text>

      {latestEntry && (
  <View style={styles.latestBox}>
     <Text style={styles.title}>
      Latest: {new Date(sleepData[sleepData.length - 1].sleep_date).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })}
    </Text>
    <Text style={styles.text}>
      Sleep: {latestEntry.sleep_time ? new Date(latestEntry.sleep_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No data'}
    </Text>
    <Text style={styles.text}>
      Wake: {latestEntry.wake_time ? new Date(latestEntry.wake_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No data'}
    </Text>
    <Text style={styles.text}>
      Duration: {latestEntry.duration_slept != null ? latestEntry.duration_slept.toFixed(2) + ' hrs': 'No data'}
    </Text>
  </View>
)}

      <Text style={styles.chartTitle}>Sleep Duration Over the Week</Text>
      <SleepBarChart data={sleepData} />
        
      <SleepPunctualityChart data={getPunctualityData(sleepData).filter((d): d is { date: string; sleepDiff: number; wakeDiff: number } => d !== null)} />

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
    fontSize: 17,
    color: 'white',
    marginBottom: 8,
    fontWeight: '500',
    alignSelf: 'center',
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
    marginTop: 20,
    alignSelf: 'center',
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
  latestBox: {
  backgroundColor: '#fff',
  padding: 14,
  borderRadius: 12,
  marginVertical: 12,
  width: '100%',
},

});