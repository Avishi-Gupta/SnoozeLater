import React, { useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function SleepTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const stopTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetTimer = () => {
    stopTimer();
    setSeconds(0);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sleep Tracker</Text>
      <Text style={styles.time}>{formatTime(seconds)}</Text>

      <View style={styles.buttons}>
        <Button title="Start" onPress={startTimer} disabled={isRunning} color={'darkblue'} />
        <Button title="Stop" onPress={stopTimer} disabled={!isRunning} color={'darkblue'}/>
        <Button title="Reset" onPress={resetTimer} color={'darkblue'}/>
      </View>
    </View>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#816ec7',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 40,
  },
  buttons: {
    flexDirection: 'row',
    gap: 15,
  },
});
