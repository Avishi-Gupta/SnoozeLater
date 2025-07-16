import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

type Task = {
  id: string;
  routine: string;
  time: Date;
  repeat?: boolean;
  notifId?: string;
  start_time?: string | null;
  status?: 'pending' | 'in_progress' | 'completed';
  current_focus_secs?: number;
  name?: string;
};

export default function PlannerScreen() {
  const router = useRouter();

  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [chooseTime, setChooseTime] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [wakeUpTime, setWakeUpTime] = useState<Date | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customTask, setCustomTask] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editModeTaskId, setEditModeTaskId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [taskOptions, setTaskOptions] = useState([
    { label: 'Assignment', value: 'Assignment' },
    { label: 'Exam Preparation', value: 'Exam Preparation' },
    { label: 'Self-Study', value: 'Self-Study' },
    { label: 'Others', value: 'Others' },
  ]);

  // const cancelAllNotifications = async () => {
  //   try {
  //     await Notifications.cancelAllScheduledNotificationsAsync();
  //     await AsyncStorage.removeItem('sleepNotifIds');
  //     await AsyncStorage.removeItem('wakeNotifIds');
  //     console.log('All scheduled notifications cancelled.');
  //   } catch (err) {
  //     console.error('Error cancelling notifications:', err);
  //   }
  // };

  useEffect(() => {
    const loadTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed')
        .order('time', { ascending: true });

      if (error) {
        console.error('Error loading tasks:', error.message);
        return;
      }

      if (data) {
        const fixedTasks = data
        .filter(task => task.status !== 'completed')
        .map((task: any) => ({
          ...task,
          time: new Date(task.time),
          notifId: task.notif_id,
          start_time: task.start_time,
          status: task.status,
          current_focus_secs: task.current_focus_secs ?? 0,
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
      if (userError || !data.user) return;
      const userId = data.user.id;

      for (const task of tasks) {
        await supabase.from('tasks').upsert({
          id: task.id,
          routine: task.routine,
          time: task.time.toISOString(),
          user_id: userId,
          repeat: task.repeat ?? false,
          start_time: task.start_time ?? null,
          status: task.status ?? 'pending',
          name: task.name ?? null,
          current_focus_secs: task.current_focus_secs ?? 0,
          ...(task.notifId !== undefined && { notif_id: task.notifId }),
        });
      }
    };

    if (tasks.length > 0) {
      saveTasks();
    }
  }, [tasks]);

  useFocusEffect(
    useCallback(() => {
      fetchSleepTimes();
    }, [])
  );

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

      if (data.target_sleep_time) {
        await scheduleSleepOrWakeNotification('Sleep', new Date(data.target_sleep_time), true);
      }
      if (data.target_wake_time) {
        await scheduleSleepOrWakeNotification('Waking Up', new Date(data.target_wake_time), true);
      }
    }
  };

  function formatTime(date: Date | null) {
    if (!date) return 'Select Time';
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async function scheduleNotification(title: string, date: Date, repeat: boolean) {
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

  const cancelOldNotification = async (key: string) => {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      const ids = JSON.parse(stored);
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      await AsyncStorage.removeItem(key);
    }
  };

  async function scheduleSleepOrWakeNotification(type: 'Sleep' | 'Waking Up', date: Date, repeat: boolean) {
    const key = type === 'Sleep' ? 'sleepNotifIds' : 'wakeNotifIds';
    await cancelOldNotification(key);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Routine Reminder',
        body: `⏰ ${type} Time ⏰`,
        sound: 'alarm-clock.mp3',
        vibrate: [500, 500, 500],
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: date.getHours(),
        minute: date.getMinutes(),
        repeats: repeat,
      },
    });

    await AsyncStorage.setItem(key, JSON.stringify([id]));
    return id;
  }

  // async function handleAddTask() {
  //   const taskTitle = selectedCategory === 'Others' ? customTask.trim() : selectedCategory;

  //   if (!selectedTime || !taskTitle) return;

  //   let notifId: string | null = null;

  //   try {
  //     const { status } = await Notifications.getPermissionsAsync();
  //     if (status !== 'granted') {
  //       const req = await Notifications.requestPermissionsAsync();
  //       if (req.status !== 'granted') {
  //         console.warn('Notification permissions not granted.');
  //       }
  //     }
  //     notifId = await scheduleNotification(taskTitle, selectedTime, repeat);
  //   } catch (err) {
  //     console.error('Notification scheduling failed:', err);
  //   }

  //     const newTask: Task = {
  //       id: String(Date.now()),
  //       routine: taskTitle,
  //       time: selectedTime,
  //       repeat,
  //       notifId: notifId ?? undefined,
  //       start_time: null,
  //       status: 'pending',
  //       current_focus_secs: 0,
  //       name: displayName.trim() || undefined, 
  //     };

  //   const updatedTasks = [...tasks, newTask].sort((a, b) => a.time.getTime() - b.time.getTime());
  //   setTasks(updatedTasks);

  //   setSelectedCategory('');
  //   setCustomTask('');
  //   setDisplayName('');
  //   setSelectedTime(null);
  //   setRepeat(false);
  // }

  async function handleAddOrUpdateTask() {
  const taskTitle = selectedCategory === 'Others' ? customTask.trim() : selectedCategory;
  if (!selectedTime || !taskTitle) return;

  let notifId: string | null = null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') {
        console.warn('Notification permissions not granted.');
      }
    }
  } catch (err) {
    console.error('Notification check failed:', err);
  }

  if (editModeTaskId) {
    const existing = tasks.find((t) => t.id === editModeTaskId);
    if (!existing) return;

    if (existing.notifId) {
      await Notifications.cancelScheduledNotificationAsync(existing.notifId);
    }

    try {
      notifId = await scheduleNotification(
        displayName.trim() ? `${taskTitle}: ${displayName.trim()}` : taskTitle,
        selectedTime,
        repeat
      );
    } catch (err) {
      console.error('Rescheduling failed:', err);
    }

    const updatedTask: Task = {
      ...existing,
      routine: taskTitle,
      time: selectedTime,
      name: displayName.trim() || undefined,
      repeat,
      notifId: notifId ?? undefined,
    };

    const updated = tasks
      .map((t) => (t.id === editModeTaskId ? updatedTask : t))
      .sort((a, b) => a.time.getTime() - b.time.getTime());

    setTasks(updated);
    setEditModeTaskId(null);
  } else {
    try {
      notifId = await scheduleNotification(
        displayName.trim() ? `${taskTitle}: ${displayName.trim()}` : taskTitle,
        selectedTime,
        repeat
      );
    } catch (err) {
      console.error('Notification scheduling failed:', err);
    }

    const newTask: Task = {
      id: String(Date.now()),
      routine: taskTitle,
      time: selectedTime,
      repeat,
      notifId: notifId ?? undefined,
      start_time: null,
      status: 'pending',
      current_focus_secs: 0,
      name: displayName.trim() || undefined,
    };

    const updatedTasks = [...tasks, newTask].sort((a, b) => a.time.getTime() - b.time.getTime());
    setTasks(updatedTasks);
  }

  setSelectedCategory('');
  setCustomTask('');
  setDisplayName('');
  setSelectedTime(null);
  setRepeat(false);
}

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);

    if (taskToDelete?.notifId) {
      await Notifications.cancelScheduledNotificationAsync(taskToDelete.notifId);
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) console.error('Error deleting from Supabase:', error.message);
   
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    await AsyncStorage.setItem('tasks', JSON.stringify(updated));
    
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan your day here!</Text>
<DropDownPicker
  open={open}
  value={selectedCategory}
  items={taskOptions}
  setOpen={setOpen}
  setValue={setSelectedCategory}
  setItems={setTaskOptions}
  placeholder="Choose Task: "
  style={{
    backgroundColor: '#4e6ab0',
    borderColor: 'white',
    marginBottom: 10,
  }}
  dropDownContainerStyle={{
    backgroundColor: '#4e6ab0',
    borderColor: 'white',
  }}
  textStyle={{
    color: '#fff',
  }}
  listItemLabelStyle={{
    color: '#fff',
  }}
  placeholderStyle={{
    color: '#fff',
  }}
/>

      {selectedCategory === 'Others' && (
        <TextInput
          placeholder="Enter custom task"
          value={customTask}
          onChangeText={setCustomTask}
          style={styles.input}
          placeholderTextColor="#FFFFFF"
        />
      )}
{selectedCategory !== 'Others' && (
  <TextInput
  placeholder="Task Description (optional)"
  value={displayName}
  onChangeText={setDisplayName}
  style={styles.input}
  placeholderTextColor="#CCCCCC"
/>
)}
    

      <TouchableOpacity onPress={() => setChooseTime(true)} style={styles.input}>
        <Text style={{ color: '#fff' }}>{formatTime(selectedTime)}</Text>
      </TouchableOpacity>

      {chooseTime && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedTime || new Date()}
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

        <TouchableOpacity style={styles.addButton} onPress={handleAddOrUpdateTask}>
        <Text style={styles.buttonText}>{editModeTaskId ? 'Update Task' : 'Add Task'}</Text>
      </TouchableOpacity>

      <View style={styles.timeRow}>
        <TouchableOpacity style={styles.timeButton} onPress={() => router.push('./SleepTimer')}>
          <Text style={styles.buttonText}>Sleep Time: {formatTime(sleepTime)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.timeButton} onPress={() => router.push('./SleepTimer')}>
          <Text style={styles.buttonText}>Wake Time: {formatTime(wakeUpTime)}</Text>
        </TouchableOpacity>
      </View>

      {/* <TouchableOpacity onPress={cancelAllNotifications}>
        <Text style={{ color: 'white' }}>🔁 Reset All Notifications</Text>
      </TouchableOpacity> */}

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.task}>
            <Text style={styles.taskText}>
              {formatTime(item.time)} : {item.routine}
              {item.name ? ` (${item.name})` : ''}
            </Text>

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '../FocusTimer',
                    params: { taskId: item.id, taskTime: item.time.toString(), status: item.status },
                  })
                }
                style={styles.beginButton}
              >
                <Text style={styles.deleteText}>
                  {item.status === 'in_progress' ? 'In Progress' : 'Begin'}
                </Text>
              </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDeleteTask(item.id)} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setEditModeTaskId(item.id);
                setSelectedTime(item.time);
                setRepeat(item.repeat ?? false);
                setSelectedCategory(item.routine);
                setCustomTask(item.routine === 'Others' ? item.routine : '');
                setDisplayName(item.name ?? '');
              }} style={[styles.deleteButton, { backgroundColor: 'darkblue' }]}
            >
              <Text style={styles.deleteText}>Edit</Text>
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
    margin: 30,
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
    fontSize: 14,
    flex: 1,
  },
  beginButton: {
  backgroundColor: '#5cb85c',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 10,
  marginRight: 5,
},
  deleteButton: {
    backgroundColor: '#ff5c5c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 5,
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
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
  flexWrap: 'wrap', 
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 3,
  gap: 10, 
},
timeLabel: {
  color: '#fff',
  fontSize: 23,
  marginBottom: 10,
  width: '50%',
},

    timeButton: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 15,
    // width: '60%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    // marginRight: 10,
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
