
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function FocusTimer() {
  const router = useRouter();

  const [inputMinutes, setInputMinutes] = useState('25'); // default 25 mins as string
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [endOptions, setEndOptions] = useState(false);
  const { taskId, taskTime } = useLocalSearchParams();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);


  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            playAlarm();
            setIsRunning(false);
            setEndOptions(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused]);

  useEffect(() => {
  const loadSound = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/sound/alarm-clock.mp3')
    );
    soundRef.current = sound;
  };

  loadSound();

   return () => {
    if (soundRef.current) {
      soundRef.current.unloadAsync();
    }
  };
}, []);

const playAlarm = async () => {
    if (soundRef.current) {
      await soundRef.current.replayAsync();
    }
};

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const Mins = minutes < 10 ? '0' + minutes : minutes;
    const Secs = secs < 10 ? '0' + secs : secs;
    return Mins + ':' + Secs;
  }

  const handleStart = () => {
    const mins = parseInt(inputMinutes);
    if (!isNaN(mins) && mins > 0) {
      setSecondsLeft(mins * 60);
      setIsRunning(true);
      setIsPaused(false);
      Keyboard.dismiss();
    }
  };

  const handlePauseResume = () => {
    if (isRunning) {
      setIsPaused((p) => !p);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setSecondsLeft(0);
  };

  const handleMarkCompleted = async () => {
  if (!taskId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: taskData } = await supabase
    .from('tasks')
    .select('repeat')
    .eq('id', taskId)
    .single();

  const scheduled = new Date(taskTime as string);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - scheduled.getTime()) / 60000);

  let points = diffMins <= 5 ? 500 : Math.max(0, 500 - diffMins * 10);

const { data: existing } = await supabase
  .from('points')
  .select('total_points, task_points')
  .eq('user_id', user.id)
  .single();

if (existing) {
  await supabase
    .from('points')
    .update({
      total_points: (existing.total_points || 0) + points,
      sleep_points: (existing.task_points || 0) + points,
      updated_at: now,
    })
    .eq('user_id', user.id);
} else {
  await supabase
    .from('points')
    .insert({
      user_id: user.id,
      total_points: points,
      task_points: points,
      updated_at: now,
    });
}


  if (!taskData?.repeat) {
    await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', user.id);
    const stored = await AsyncStorage.getItem('tasks');
    if (stored) {
      const updated = JSON.parse(stored).filter((t: any) => t.id !== taskId);
      await AsyncStorage.setItem('tasks', JSON.stringify(updated));
    }
  } else {
    Alert.alert('Marked Completed', 'This task will repeat tomorrow.');
  }

  router.replace('/Dashboard/DailyPlanner');
};  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Focus Timer</Text>

      {!isRunning ? (
        <View style={styles.inputContainer}>
          <TextInput
            keyboardType="number-pad"
            placeholder="Enter minutes"
            value={inputMinutes}
            onChangeText={setInputMinutes}
            style={styles.input}
            editable={!isRunning}
          />
          <TouchableOpacity style={styles.button} onPress={handleStart}>
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: isPaused ? 'purple' : 'maroon' }]}
            onPress={handlePauseResume}
          >
            <Text style={styles.buttonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#999' }]}
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </>
      )}

      {isRunning && isPaused && (
        <TouchableOpacity
          onPress={handleMarkCompleted}
          style={{ backgroundColor: '#4caf50', padding: 12, borderRadius: 8, marginTop: 20 }}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Mark Completed</Text>
        </TouchableOpacity>
      )}

          {endOptions && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Time's up!</Text>

            <TouchableOpacity
              style={[styles.button, { marginBottom: 10, backgroundColor: '#4e6ab0' }]}
              onPress={() => {
                setIsRunning(false);
                setIsPaused(false);
                setEndOptions(false);
              }}
            >
              <Text style={styles.buttonText}>Need More Time</Text>
            </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#5cb85c' }]}
          onPress={handleMarkCompleted}
        >
          <Text style={styles.buttonText}>Mark as Completed</Text>
        </TouchableOpacity>

            </View>
          </View>
        )}


      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#4e6ab0', marginTop: 30 }]}
        onPress={() => router.replace('/Dashboard/DailyPlanner')}
      >
        <Text style={styles.buttonText}>Back to Planner</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#816ec7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
    color: 'white',
  },
  timer: {
    fontSize: 60,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#fff',
  },
  button: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: 'white',
    color: 'white',
    fontSize: 18,
    width: 100,
    padding: 10,
    borderRadius: 8,
    marginRight: 15,
    textAlign: 'center',
  },
  popupOverlay: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
},
popupContainer: {
  backgroundColor: '#fff',
  padding: 24,
  borderRadius: 12,
  alignItems: 'center',
  width: '80%',
},
});
