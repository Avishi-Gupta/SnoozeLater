import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function SleepTimer() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sleepId, setSleepId] = useState<number | null>(null);
  const [pickerType, setPickerType] = useState<'sleep' | 'wake' | null>(null);

  const [sleepTime, setSleepTime] = useState(new Date());
  const [wakeTime, setWakeTime] = useState(new Date());
  const [sleepSaved, setSleepSaved] = useState(false);
  

  const [sleepStart, setSleepStart] = useState<Date | null>(null);
  const [sleepEnd, setSleepEnd] = useState<Date | null>(null);


  useEffect(() => {
    const restoreState = async () => {
      const storedStart = await AsyncStorage.getItem('sleepStart');
      if (storedStart) {
        const startTime = new Date(storedStart);
        setSleepStart(startTime);
        updateElapsedTime(startTime);

        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setSeconds(elapsed);
        setIsRunning(true);

        intervalRef.current = setInterval(() => {
          updateElapsedTime(startTime);
        }, 1000);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sleep_data')
        .select('id, target_sleep_time, target_wake_time')
        .eq('user_id', user.id)
        .order('sleep_date', { ascending: false })
        .limit(1)
        .single();

        const sleepDate = getSleepDate(new Date());

      const { data: existingSleep } = await supabase
        .from('sleep_data')
        .select('sleep_time, wake_time')
        .eq('user_id', user.id)
        .eq('sleep_date', sleepDate)
        .maybeSingle();

      if (existingSleep?.sleep_time && existingSleep?.wake_time) {
        setSleepSaved(true);
}

      if (data) {
        setSleepId(data.id);
        if (data.target_sleep_time) setSleepTime(new Date(data.target_sleep_time));
        if (data.target_wake_time) setWakeTime(new Date(data.target_wake_time));
      }
    };

    restoreState();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const updateElapsedTime = (startTime: Date) => {
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
  setSeconds(elapsed);
};

  const startTimer = async () => {
    if (!isRunning) {
      const now = new Date();
      setSleepStart(now);
      await AsyncStorage.setItem('sleepStart', now.toISOString());

      setIsRunning(true);
      updateElapsedTime(now);
      intervalRef.current = setInterval(() => {
         updateElapsedTime(now);
      }, 1000);
    }
  };

const stopTimer = async () => {
  setIsRunning(false);
  setSleepEnd(new Date());
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  await AsyncStorage.removeItem('sleepStart');
};

  const resetTimer = async () => {
    await stopTimer();
    setSeconds(0);
    setSleepStart(null);
    setSleepEnd(null);
    AsyncStorage.removeItem('sleepStart');
  };

function getSleepDate(sleepTime: Date): string {
  if (!(sleepTime instanceof Date)) sleepTime = new Date(sleepTime);
  const adjusted = new Date(sleepTime);
  
  if (adjusted.getHours() >= 0 && adjusted.getHours() < 3) {
    adjusted.setDate(adjusted.getDate() - 1);
  }

  return adjusted.toISOString().split('T')[0];
}

function applyTimeToToday(time: Date): Date {
  const now = new Date();
  const merged = new Date(now);
  merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return merged;
}

const saveTargetTimes = async (type: 'sleep' | 'wake', time: Date) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return alert('Not logged in');

  const sleepDate = getSleepDate(type === 'sleep' ? time : sleepTime);
  console.log("Saving sleep date as:", sleepDate);

  const updateFields =
    type === 'sleep'
      ? { target_sleep_time: time.toISOString() }
      : { target_wake_time: time.toISOString() };

  const { data, error } = await supabase
    .from('sleep_data')
    .upsert({
      user_id: user.id,
      sleep_date: sleepDate,
      ...updateFields,
    }, { onConflict: 'user_id, sleep_date' })
    .select('id')
    .single();

  if (error) {
    alert('Error saving target time: ' + error.message);
  } else {
    setSleepId(data.id);
    alert(`${type === 'sleep' ? 'Sleep' : 'Wake'} time saved!`);
  }
};



const saveSleepData = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return alert('Not logged in');
  if (!sleepStart || !sleepEnd) return alert('Sleep not tracked yet.');

  const durationMs = sleepEnd.getTime() - sleepStart.getTime();
  const durationHours = Math.round(durationMs / 3600000);
  const sleepDate = getSleepDate(sleepStart);

  const { data: existing, error: checkError } = await supabase
    .from('sleep_data')
    .select('sleep_time, wake_time')
    .eq('user_id', user.id)
    .eq('sleep_date', sleepDate)
    .maybeSingle();

  if (checkError) return alert('Error checking existing sleep data');

  if (existing?.sleep_time && existing?.wake_time) {
    return alert('Sleep data already saved for today!');
  }

  const { error } = await supabase
    .from('sleep_data')
    .upsert({
      user_id: user.id,
      sleep_date: sleepDate,
      sleep_time: sleepStart.toISOString(),
      wake_time: sleepEnd.toISOString(),
      duration_slept: durationHours,
      target_sleep_time: sleepTime.toISOString(),
      target_wake_time: wakeTime.toISOString(),
    }, { onConflict: 'user_id, sleep_date' });

  if (error) {
    alert('Error saving sleep data: ' + error.message);
  } else {
    alert('Sleep data saved!');
    setSleepSaved(true); 
  }
};


const awardSleepPoints = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return alert('Not logged in');

  const { data, error: fetchError } = await supabase
    .from('sleep_data')
    .select('*')
    .eq('user_id', user.id)
    .order('sleep_date', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !data) {
    return alert('No sleep data found');
  }

function copyTimeToDate(targetTime: Date, baseDate: Date) {
  const newDate = new Date(baseDate);
  newDate.setHours(targetTime.getHours(), targetTime.getMinutes(), 0, 0);
  return newDate;
}

const targetSleep = new Date(data.target_sleep_time);
const targetWake = new Date(data.target_wake_time);
const actualSleep = new Date(data.sleep_time);
const actualWake = new Date(data.wake_time);

const alignedTargetSleep = copyTimeToDate(targetSleep, actualSleep);
const alignedTargetWake = copyTimeToDate(targetWake, actualWake);

const sleepDiffMins = Math.abs(Math.floor((actualSleep.getTime() - alignedTargetSleep.getTime()) / 60000));
const wakeDiffMins = Math.abs(Math.floor((actualWake.getTime() - alignedTargetWake.getTime()) / 60000));


  let points = 0;

  const totalDeviation = sleepDiffMins + wakeDiffMins;
  if (totalDeviation <= 10) {
    points = 500;
  } else {
    points = Math.max(0, 500 - (totalDeviation / 10) * 10);
  }

  const sleepDurationHrs = (actualWake.getTime() - actualSleep.getTime()) / 3600000;
  if (sleepDurationHrs < 7.5 || sleepDurationHrs > 9) {
    points -= 200;
  }

  points = Math.max(0, points);

  const now = new Date();

  const { data: existing, error: pointsError } = await supabase
    .from('points')
    .select('total_points, sleep_points')
    .eq('user_id', user.id)
    .single();

  if (pointsError) {
    return alert('Failed to fetch user points');
  }

  if (existing) {
    await supabase
      .from('points')
      .update({
        total_points: (existing.total_points || 0) + points,
        sleep_points: (existing.sleep_points || 0) + points,
        updated_at: now,
      })
      .eq('user_id', user.id);
  } else {
    await supabase
      .from('points')
      .insert({
        user_id: user.id,
        total_points: points,
        sleep_points: points,
        updated_at: now,
      });
  }

  alert(`🎉 Sleep points awarded: ${points}`);
};

const handleSaveAndAwardPoints = async () => {
  if (seconds === 0) {
    alert("You haven't tracked any sleep time yet!");
    return;
  }

  await saveSleepData();       
  await awardSleepPoints();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    alert('Not logged in');
    return;
  }

  const newBadges = await assignBadgesForUser(user.id);
  if (newBadges && newBadges.length > 0) {
    Alert.alert(
      '🎉 New Badge Earned!',
      newBadges.map((b: { name: any; description: any; }) => `🏅 ${b.name}: ${b.description}`).join('\n'),
    );
  }
  resetTimer();   
  
  const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY25oanZtaXpjb3h4cmV5aWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjM4MiwiZXhwIjoyMDY0MjAyMzgyfQ.zE7SIRAvUth8eA9Nj2RLtzQTJynffB15e_Qmf0DqNc0'; 
  async function assignBadgesForUser(userId: string) {
    try {
      const res = await fetch('https://gfcnhjvmizcoxxreyife.functions.supabase.co/singleAssignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Badge assignment error:', data.error);
      return [];
    } else {
      console.log('Badges updated:', data.badges);
      return data.badges || [];
    }
    } catch (error) {
      console.error('Error calling badge assignment:', error);
      return [];
    }
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sleep Tracker</Text>
      <Text style={styles.time}>{formatClock(seconds)}</Text>

      <View style={styles.buttons}>
        <Button title="Start" onPress={startTimer} disabled={isRunning} color={'darkblue'} />
        <Button title="Stop" onPress={stopTimer} disabled={!isRunning} color={'darkblue'} />
        <Button title="Reset" onPress={resetTimer} color={'darkblue'} />
        <Button
          title="Save"
          onPress={handleSaveAndAwardPoints}
          color="darkblue"
          disabled={sleepSaved}
        />
      </View>

      <TouchableOpacity onPress={() => setPickerType('sleep')} style={styles.timeButton}>
  <Text style={styles.timeText}>Set Sleep Time: {formatTime(sleepTime)}</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => setPickerType('wake')} style={styles.timeButton}>
  <Text style={styles.timeText}>Set Wake Time: {formatTime(wakeTime)}</Text>
</TouchableOpacity>
<DateTimePickerModal
  isVisible={pickerType !== null}
  mode="time"
  date={pickerType === 'sleep' ? sleepTime : wakeTime}
  onConfirm={(date) => {
    const adjustedTime = applyTimeToToday(date);
    if (pickerType === 'sleep') {
      setSleepTime(adjustedTime);
      saveTargetTimes('sleep', adjustedTime);
    } else if (pickerType === 'wake') {
      setWakeTime(adjustedTime);
      saveTargetTimes('wake', adjustedTime);
    }
    setPickerType(null);
  }}
  onCancel={() => setPickerType(null)}
  is24Hour={false}
/>
    </View>
  );
}

function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const Hrs = hours < 10 ? '0' + hours : hours;
  const Mins = minutes < 10 ? '0' + minutes : minutes;
  const Secs = secs < 10 ? '0' + secs : secs;

  return `${Hrs}:${Mins}:${Secs}`;
}


  function formatTime(date: Date) {
  if (!(date instanceof Date)) date = new Date(date); 
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  }


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#816ec7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    marginBottom: 20,
  },
  time: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#0ff',
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  timeButton: {
    backgroundColor: '#5e4dbf',
    padding: 12,
    marginVertical: 10,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  timeText: {
    color: 'white',
    fontSize: 18,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 20,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#4e6ab0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
