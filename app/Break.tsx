import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Break() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(300); 
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    playMusic();

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          router.replace('/FocusTimer');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const playMusic = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/sound/Evening Harmony.mp3'),
      { isLooping: true } 
    );
    soundRef.current = sound;
    await sound.playAsync();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🌿 Break Time</Text>
      <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>

      <View style={styles.tipsBox}>
        <Text style={styles.tip}>🧘 Take deep breaths</Text>
        <Text style={styles.tip}>🧍‍♂️ Stretch your arms and legs</Text>
        <Text style={styles.tip}>🚶 Walk around for a bit</Text>
        <Text style={styles.tip}>💧 Sip some water</Text>
      </View>

      <TouchableOpacity
        onPress={async () => {
          router.replace('/FocusTimer');
        }}
        style={styles.skipButton}
      >
        <Text style={styles.skipText}>Back to Focus</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#816ec7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    fontSize: 28,
    color: 'white',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  timer: {
    fontSize: 60,
    color: '#fff',
    marginVertical: 20,
  },
  tipsBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    marginBottom: 30,
  },
  tip: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333',
  },
  skipButton: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
  },
  skipText: {
    color: 'white',
    fontSize: 18,
  },
});
