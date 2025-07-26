import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

export default function FocusTimer() {
  useKeepAwake();
  const router = useRouter();
  const { taskId, taskTime } = useLocalSearchParams();
  const [inputMinutes, setInputMinutes] = useState('25');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [endOptions, setEndOptions] = useState(false); 

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [focusDuration, setFocusDuration] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pauseTime, setPauseTime] = useState<Date | null>(null);
  const [remainingAtPause, setRemainingAtPause] = useState<number | null>(null);

  const hasPromptedBreakRef = useRef(false);
  const [showBreakButton, setShowBreakButton] = useState(false); 
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(300); 
  const breakIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


useEffect(() => {
  const restoreTimer = async () => {

    const storedStart = await AsyncStorage.getItem('focusStart');
    const storedDuration = await AsyncStorage.getItem('focusDuration');
    const paused = await AsyncStorage.getItem('focusPaused');
    const pausedAt = await AsyncStorage.getItem('focusPausedAt');
    const pausedRemaining = await AsyncStorage.getItem('focusRemainingAtPause');

    if (storedStart && storedDuration) {
      const start = new Date(storedStart);
      const duration = parseInt(storedDuration, 10);

      if (paused === 'true' && pausedRemaining) {
        setFocusDuration(duration);
        setSecondsLeft(parseInt(pausedRemaining));
        setStartTime(start);
        setIsPaused(true);
        setIsRunning(true);
        return;
      }

      const now = new Date();
      const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
      const remaining = Math.max(duration - elapsed, 0);

      if (remaining <= 0) {
        setSecondsLeft(0);
        setIsRunning(false);
        setEndOptions(true);
        playAlarm();
        await AsyncStorage.multiRemove([
          'focusStart',
          'focusDuration',
          'focusPaused',
          'focusPausedAt',
          'focusRemainingAtPause',
        ]);
        return;
      }

      setFocusDuration(duration);
      setSecondsLeft(remaining);
      setIsRunning(true);
      setStartTime(start);
    }
  };

  restoreTimer();
}, []);

useEffect(() => {
  if (isRunning && !isPaused && startTime) {
    timerRef.current = setInterval(async () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const remaining = Math.max(focusDuration - elapsed, 0);

      setSecondsLeft(remaining);

      if (elapsed > 0 && elapsed % 3000 === 0) {
        Alert.alert(
          '⏳ Time for a Break?',
          'You’ve been focusing for 50 minutes. Pause, stretch, breathe, and rest your eyes!',
          [{ text: 'OK' }]
        );
      }

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        await AsyncStorage.multiRemove([
          'focusStart',
          'focusDuration',
          'focusPaused',
          'focusPausedAt',
          'focusRemainingAtPause',
        ]);
        setIsRunning(false);
        setEndOptions(true);
        playAlarm();
      }
    }, 1000);
  }

  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, [isRunning, isPaused, startTime, focusDuration]);

useEffect(() => {
  if (showBreakModal) {
    breakIntervalRef.current = setInterval(() => {
      setBreakSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(breakIntervalRef.current!);
          setShowBreakModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return () => {
    if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
  };
}, [showBreakModal]);

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
  Vibration.vibrate([500, 1000, 500]);
};

const handleStart = async () => {
    const { data: existingTask, error } = await supabase
    .from('tasks')
    .select('start_time')
    .eq('id', taskId)
    .single();

  if (error) {
    console.error('Failed to fetch task', error.message);
    return;
  }

  if (!existingTask.start_time) {
    await supabase
      .from('tasks')
      .update({
        start_time: new Date().toISOString(),
        status: 'in_progress',
      })
      .eq('id', taskId);
  } else {

    await supabase
      .from('tasks')
      .update({ status: 'in_progress' })
      .eq('id', taskId);
  }
  await AsyncStorage.multiRemove([
  'focusStart',
  'focusDuration',
  'pauseTime',
  'remainingAtPause'
]);
  const mins = parseInt(inputMinutes);
  if (!isNaN(mins) && mins > 0) {
    const now = new Date();
    const totalSeconds = mins * 60;

    setFocusDuration(totalSeconds);
    setSecondsLeft(totalSeconds);
    setStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    setPauseTime(null);
    setRemainingAtPause(null);
    Keyboard.dismiss();

    await AsyncStorage.setItem('focusStart', now.toISOString());
    await AsyncStorage.setItem('focusDuration', totalSeconds.toString());

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Time’s Up!',
        body: 'Your focus timer has ended.',
        sound: true,
      },
      trigger: {
        seconds: totalSeconds,
        repeats: false,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,

        channelId: 'default',
      },
    });
  }
};


const handlePauseResume = async () => {
  if (!isRunning) return;

  if (!isPaused) {
    setShowBreakButton(true);
  } else {
    hasPromptedBreakRef.current = false; 
    setShowBreakButton(false);
  }

  if (!isPaused) {
    const now = new Date();
    setPauseTime(now);
    setRemainingAtPause(secondsLeft);
    setIsPaused(true);

    await AsyncStorage.setItem('focusPaused', 'true');
    await AsyncStorage.setItem('focusPausedAt', now.toISOString());
    await AsyncStorage.setItem('focusRemainingAtPause', secondsLeft.toString());

    await Notifications.cancelAllScheduledNotificationsAsync();
  } else {
    const now = new Date();
    const newStart = new Date(now.getTime() - (focusDuration - (remainingAtPause ?? secondsLeft)) * 1000);

    setStartTime(newStart);
    setIsPaused(false);
    setPauseTime(null);
    setRemainingAtPause(null);

    await AsyncStorage.setItem('focusStart', newStart.toISOString());
    await AsyncStorage.removeItem('focusPaused');
    await AsyncStorage.removeItem('focusPausedAt');
    await AsyncStorage.removeItem('focusRemainingAtPause');


    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Time’s Up!',
        body: 'Your focus timer has ended.',
        sound: true,
      },
      trigger: {
        seconds: secondsLeft,
        repeats: false,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,

        channelId: 'default',
      },
    });
  }
};

const handleNeedMoreTime = () => {
  Alert.prompt(
    'Need More Time?',
    'Enter extra minutes you want to add:',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Add',
        onPress: async (text) => {
          const extraMins = parseInt(text ?? '0');
          if (!isNaN(extraMins) && extraMins > 0) {
            const extraSecs = extraMins * 60;
            const newDuration = focusDuration + extraSecs;
            const newSecondsLeft = secondsLeft + extraSecs;

            setFocusDuration(newDuration);
            setSecondsLeft(newSecondsLeft);
            setIsRunning(true);
            setEndOptions(false);

            const newStart = new Date(Date.now() - (focusDuration - secondsLeft) * 1000);
            setStartTime(newStart);

            await AsyncStorage.setItem('focusStart', newStart.toISOString());
            await AsyncStorage.setItem('focusDuration', newDuration.toString());

            await Notifications.scheduleNotificationAsync({
              content: {
                title: '⏰ Time’s Up!',
                body: 'Your focus timer has ended.',
                sound: true,
              },
              trigger: {
                seconds: newSecondsLeft,
                repeats: false,
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,

                channelId: 'default',
              },
            });
          }
        },
      },
    ],
    'plain-text',
    '5' 
  );
};

const handleMarkInProgress = async () => {
  if (!taskId || !isPaused) return;

  const focusSoFar = focusDuration - (remainingAtPause ?? secondsLeft);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: taskRow, error } = await supabase
    .from('tasks')
    .select('current_focus_secs')
    .eq('id', taskId)
    .single();

  if (error) {
    console.error('Error fetching task:', error.message);
    return;
  }

  const totalSoFar = (taskRow?.current_focus_secs || 0) + focusSoFar;

  await supabase
    .from('tasks')
    .update({ current_focus_secs: totalSoFar,  status: 'in_progress' })
    .eq('id', taskId);

  Alert.alert('Progress Saved', 'This task is marked as In Progress.');

  setIsRunning(false);
  setIsPaused(false);
  setFocusDuration(0);
  setStartTime(null);
  setPauseTime(null);
  setRemainingAtPause(null);
  setSecondsLeft(0);

  await AsyncStorage.multiRemove([
    'focusStart',
    'focusDuration',
    'focusPaused',
    'focusPausedAt',
    'focusRemainingAtPause',
  ]);

  router.replace('/Dashboard/DailyPlanner');
};

const handleReset = async () => {
  setIsRunning(false);
  setIsPaused(false);
  setFocusDuration(0);
  setStartTime(null);
  setPauseTime(null);
  setRemainingAtPause(null);
  setSecondsLeft(0);
  await AsyncStorage.multiRemove([
    'focusStart',
    'focusDuration',
    'focusPaused',
    'focusPausedAt',
    'focusRemainingAtPause',
  ]);
  await Notifications.cancelAllScheduledNotificationsAsync();
};



  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes < 10 ? '0' + minutes : minutes}:${
      secs < 10 ? '0' + secs : secs
    }`;
  }

const handleMarkCompleted = async () => {
  if (!taskId) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !taskData) {
    console.error('Error fetching task:', taskError?.message);
    return;
  }

  const scheduled = new Date(taskTime as string);
  const started = new Date(taskData.start_time);
  const now = new Date();

  const diffMins = Math.floor((started.getTime() - scheduled.getTime()) / 60000);
  const points = diffMins <= 5 ? 500 : Math.max(0, 500 - diffMins * 10);

    const category = ['Assignment', 'Exam Preparation', 'Self-Study'].includes(taskData.routine)
    ? taskData.routine
    : 'Others';

   const focusSoFar = focusDuration - secondsLeft;

    const { data: taskRow } = await supabase
      .from('tasks')
      .select('current_focus_secs')
      .eq('id', taskId)
      .single();

const totalFocusTime = (taskRow?.current_focus_secs || 0) + focusSoFar;

    await supabase
      .from('tasks')
      .update({
        status: 'completed',
        current_focus_secs: totalFocusTime
      })
      .eq('id', taskId);

  await supabase.from('tasks_completed').insert({
    user_id: user.id,
    task_id: taskId,
    routine: taskData.routine,
    category, 
    scheduled_time: scheduled.toISOString(),
    completed_time: now.toISOString(),
    punctuality_mins: diffMins,
    points_earned: points,
    time_spent_secs: totalFocusTime,
  });

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
        task_points: (existing.task_points || 0) + points,
        updated_at: now,
      })
      .eq('user_id', user.id);
  } else {
    await supabase.from('points').insert({
      user_id: user.id,
      total_points: points,
      task_points: points,
      updated_at: now,
    });
  }

  Alert.alert('Task Completed', `You earned ${points} points!`);

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

async function assignBadgesForUser(userId: string): Promise<any[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('https://gfcnhjvmizcoxxreyife.supabase.co/functions/v1/badgeAssignment2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error('Badge assignment error:', data.error);
      return [];
    }

    return data.badges || [];
  } catch (error) {
    console.error('Error calling badge assignment:', error);
    return [];
  }
}

const newBadges = await assignBadgesForUser(user.id);
if (newBadges.length > 0) {
  Alert.alert(
    '🎉 New Badge Earned!',
    newBadges.map(b => `🏅 ${b.name}: ${b.description}`).join('\n'),
  );
}

  await AsyncStorage.multiRemove(['focusStart', 'focusDuration', 'focusPaused', 'focusPausedAt', 'focusRemainingAtPause',]);

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
          />
          <TouchableOpacity style={styles.button} onPress={handleStart}>
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>

          <View style={styles.timeRow}>
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
          </View>
        </>
      )}
    
      {isRunning && isPaused && (
        <TouchableOpacity
          onPress={handleMarkCompleted}
          style={[styles.button, { backgroundColor: '#5cb85c' }]}
        >
          <Text style={styles.buttonText}>Mark Completed</Text>
        </TouchableOpacity>
      )}

      {endOptions && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Time's up!</Text>

            <TouchableOpacity
              style={[styles.button, { marginBottom: 10, backgroundColor: '#4e6ab0' }]}
              onPress={() => {
                setEndOptions(false);
                handleNeedMoreTime();
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

{isPaused && !endOptions && (
  <TouchableOpacity
    onPress={handleMarkInProgress}
    style={[styles.button, { backgroundColor: 'orange' }]}
  >
    <Text style={styles.buttonText}>Mark as In Progress</Text>
  </TouchableOpacity>
)}

 {isPaused && showBreakButton && (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: 'lightpurple' }]}
    onPress={async () => {
    setBreakSecondsLeft(300); 
    setShowBreakModal(true);

    setShowBreakButton(false);
  }}
  >

    <Text style={styles.buttonText}>Take a 5 min break</Text>
  </TouchableOpacity>
)} 

   {!isRunning && (
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#4e6ab0', marginTop: 30 }]}
        onPress={() => router.replace('/Dashboard/DailyPlanner')}
      >
        <Text style={styles.buttonText}>Back to Planner</Text>
      </TouchableOpacity>
      )}

      {showBreakModal && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>🌿 Break Time</Text>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>
              {`Time left: ${Math.floor(breakSecondsLeft / 60)}:${(breakSecondsLeft % 60).toString().padStart(2, '0')}`}
            </Text>
            <Text style={{ textAlign: 'center', marginBottom: 10 }}>
              💡 Tip: Close your eyes for 20 seconds, do light stretching, or grab some water!
            </Text>

                  <TouchableOpacity
        onPress={() => {
          setShowBreakModal(false);
          if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
        }}
        style={[styles.button, { marginTop: 10 }]}
      >
        <Text style={styles.buttonText}>Skip Break</Text>
      </TouchableOpacity>

            <Text style={{ fontSize: 12, color: 'gray' }}>
              This popup will close automatically after 5 minutes.
            </Text>
          </View>
        </View>
      )}
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
    marginRight: 10,
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
timeRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  width: 'auto',
  marginBottom: 3,
},
});
