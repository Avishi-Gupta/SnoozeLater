import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Task = {
  id: string;
  routine: string;
  time: Date;
  repeat?: boolean;
  notifId?: string;
};

export default function PlannerScreen() {
  const router = useRouter();

  const [routine, setRoutine] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [chooseTime, setChooseTime] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [wakeUpTime, setWakeUpTime] = useState<Date | null>(null);
  const [repeat, setRepeat] = useState(false);


  useEffect(() => {
    const loadTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('time', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error.message);
      return;
    }

    if (data) {
      const fixedTasks = data.map((task: any) => ({
        ...task,
        time: new Date(task.time),
      }));
      setTasks(fixedTasks);
      await AsyncStorage.setItem('tasks', JSON.stringify(fixedTasks)); 
    }
  };

  loadTasks();
}, []);

  useEffect(() => {
    AsyncStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

useEffect(() => {
  const saveTasks = async () => {
    await AsyncStorage.setItem('tasks', JSON.stringify(tasks));
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      return;
    }
    const userId = data.user.id;

    for (const task of tasks) {
      await supabase.from('tasks').upsert({
        id: task.id, 
        routine: task.routine, 
        time: task.time.toISOString(),
        user_id: userId, 
      });
    }
  };

  if (tasks.length > 0) {
    saveTasks(); 
  }
}, [tasks]); 

useEffect(() => {
    fetchSleepTimes();
  }, []);

  const fetchSleepTimes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('sleep_data')
      .select('target_sleep_time, target_wake_time')
      .eq('user_id', user.id)
      .order('inserted_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      if (data.target_sleep_time) setSleepTime(new Date(data.target_sleep_time));
      if (data.target_wake_time) setWakeUpTime(new Date(data.target_wake_time));
      
      await cancelPreviousSleepNotifications();

      if (data.target_sleep_time) {
        await scheduleSleepOrWakeNotification('Sleep Time', new Date(data.target_sleep_time), true);
      }
      if (data.target_wake_time) {
        await scheduleSleepOrWakeNotification('Wake Up Time', new Date(data.target_wake_time), true);
      }
      if (data.target_wake_time) scheduleAlarm(new Date(data.target_wake_time));
    }
  };

  function formatTime(date: Date | null) {
if (!date) return '--:--';
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  async function scheduleNotification(title: string, date: Date, repeat: boolean){
     const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Routine Reminder',
        body: `Time for: ${title}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: date.getHours(),
        minute: date.getMinutes(),
        repeats: repeat,
      },
    });

    return id;
  }

  const cancelPreviousSleepNotifications = async () => {
  const stored = await AsyncStorage.getItem('sleepNotificationIds');
  if (stored) {
    const ids = JSON.parse(stored);
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }
  await AsyncStorage.removeItem('sleepNotificationIds');
};

async function scheduleSleepOrWakeNotification(title: string, date: Date, repeat: boolean) {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Routine Reminder',
      body: `Time for: ${title}`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: date.getHours(),
      minute: date.getMinutes(),
      repeats: repeat,
    },
  });

  const existing = await AsyncStorage.getItem('sleepNotificationIds');
  const ids = existing ? JSON.parse(existing) : [];
  ids.push(id);
  await AsyncStorage.setItem('sleepNotificationIds', JSON.stringify(ids));

  return id;
}

async function scheduleAlarm(date: Date) {
    const now = new Date();
    const delay = date.getTime() - now.getTime();
    if (delay <= 0) return;

    setTimeout(() => {
      const sound = new Audio.Sound();
      (async () => {
        try {
          await sound.loadAsync(require('@/assets/alarm-clock.mp3')); 
          await sound.playAsync();
        } catch (error) {
          console.error('Alarm error:', error);
        }
      })();
    }, delay);
  }

async function handleAddTask() {
  if (routine.trim() === '') return;

  const notifId = await scheduleNotification(routine, selectedTime, repeat);

  const newTask: Task = {
    id: String(Date.now()),
    routine,
    time: selectedTime,
    repeat,
    notifId,
  };

  const updatedTasks = [...tasks, newTask].sort((a, b) => a.time.getTime() - b.time.getTime());

  setTasks(updatedTasks);
  setRoutine('');
  setSelectedTime(new Date());
  setRepeat(false);
}


const handleDeleteTask = async (taskId: string) => {
  const taskToDelete = tasks.find((t) => t.id === taskId);

  if (taskToDelete?.notifId) {
    await Notifications.cancelScheduledNotificationAsync(taskToDelete.notifId);
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting from Supabase:', error.message);
  }

  const updated = tasks.filter((t) => t.id !== taskId);
  await AsyncStorage.setItem('tasks', JSON.stringify(updated));
  setTasks(updated); 
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan your day here!</Text>

      <TextInput
        placeholder="What do you want to do?"
        value={routine}
        onChangeText={setRoutine}
        style={styles.input}
        placeholderTextColor="#FFFFFF"
      />

<TouchableOpacity onPress={() => setChooseTime(true)} style={styles.input}>
  <Text style={{ color: '#fff' }}> Select Time : {formatTime(selectedTime)}</Text>
</TouchableOpacity>

      {chooseTime && (
  <View style={styles.pickerOverlay}>
    <View style={styles.pickerContainer}>
      <DateTimePicker
        value={selectedTime}
        mode="time"
        display="spinner"
        onChange={(event, date) => {
          if (date) {
            setSelectedTime(date);
          }
        }}
        style={{ backgroundColor: '#fff' }}
      />
      <TouchableOpacity onPress={() => setChooseTime(false)} style={styles.closeButton}>
        <Text style={{ color: '#fff' }}>Done</Text>
      </TouchableOpacity>
    </View>
  </View>
)}

<View style={{ flexDirection: 'row', marginBottom: 10 }}>
  <TouchableOpacity onPress={() => setRepeat(false)} style={[styles.repeatButton, !repeat && styles.selectedRepeat]}>
    <Text style={styles.buttonText}>Once</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => setRepeat(true)} style={[styles.repeatButton, repeat && styles.selectedRepeat]}>
    <Text style={styles.buttonText}>Repeat</Text>
  </TouchableOpacity>
</View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.buttonText}>Add Task</Text>
      </TouchableOpacity>

      <View style={styles.timeRow}>
  <Text style={styles.timeLabel}>Sleep Time: {formatTime(sleepTime)}</Text>
  <TouchableOpacity style={styles.timeButton} onPress={() => router.push('./SleepTimer')}>
    <Text style={styles.buttonText}>Set Sleep Time</Text>
  </TouchableOpacity>
</View>

<View style={styles.timeRow}>
  <Text style={styles.timeLabel}>Wake Up Time: {formatTime(wakeUpTime)}</Text>
  <TouchableOpacity style={styles.timeButton} onPress={() => router.push('./SleepTimer')}>
    <Text style={styles.buttonText}>Set Wake Time</Text>
  </TouchableOpacity>
</View>


      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.task}>
            <Text style={styles.taskText}>
              {formatTime(item.time)} : {item.routine}
            </Text>

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '../FocusTimer',
            params: {
              taskId: item.id,
              taskTime: item.time.toString(),
            },
          })
        }
        style={styles.beginButton}
      >
        <Text style={styles.buttonText}>Begin</Text>
      </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDeleteTask(item.id)} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        style={{ marginTop: 20, width: '100%' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#816EC7',
  },
  title: {
    fontSize: 24,
    margin: 60,
    color: 'white',
  },
  addButton: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 15,
    width: '50%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    color: 'white',
    borderWidth: 1,
    marginBottom: 15,
    padding: 10,
    borderRadius: 10,
    borderColor: 'white',
    width: '100%',
  },
  task: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
  },
  beginButton: {
  backgroundColor: '#5cb85c',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 10,
  marginRight: 10,
},
  deleteButton: {
    backgroundColor: '#ff5c5c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 10,
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pickerOverlay: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
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
timeRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  width: '70%',
  marginBottom: 3,
},
timeLabel: {
  color: '#fff',
  fontSize: 16,
  marginBottom: 15,
  width: '50%',
},

    timeButton: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 15,
    width: '70%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  repeatButton: {
  padding: 10,
  backgroundColor: '#4e6ab0',
  borderRadius: 8,
  marginHorizontal: 5,
},
selectedRepeat: {
  backgroundColor: '#2e4a8b',
},

});
