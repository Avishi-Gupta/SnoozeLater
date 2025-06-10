
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
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
});
