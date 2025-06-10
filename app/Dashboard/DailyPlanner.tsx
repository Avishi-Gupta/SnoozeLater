import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Task = { id: string; routine: string; time: Date };

export default function PlannerScreen() {
  const router = useRouter();

  const [routine, setRoutine] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [chooseTime, setChooseTime] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadTasks = async () => {
      const storedTasks = await AsyncStorage.getItem('tasks');
      if (storedTasks) {
        const parsed = JSON.parse(storedTasks);

        const fixedTasks = parsed.map((task: any) => ({
          ...task,
          time: task.time ? new Date(task.time) : new Date(),
        }));

        setTasks(fixedTasks);
      }
    };

    loadTasks();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleFocusTimerPress = () => {
    router.push('../FocusTimer');
  };

  function formatTime(date: Date) {
  if (!(date instanceof Date)) date = new Date(date); 
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async function scheduleNotification(title: string, date: Date) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Routine Reminder',
        body: `Time for: ${title}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: date.getHours(),
        minute: date.getMinutes(),
        repeats: false,
      },
    });
  }

  function handleAddTask() {
    if (routine.trim() === '') return;

    const newTask: Task = {
      id: String(Date.now()),
      routine,
      time: selectedTime,
    };

    const updatedTasks = [...tasks, newTask].sort((a, b) => a.time.getTime() - b.time.getTime());

    setTasks(updatedTasks);
    setRoutine('');
    setSelectedTime(new Date());

    scheduleNotification(routine, selectedTime);
  }

  function handleDeleteTask(id: string) {
    setTasks(tasks.filter((task) => task.id !== id));
  }

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

      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.buttonText}>Add Task</Text>
      </TouchableOpacity>
{/* 
      <TouchableOpacity style={styles.button} onPress={handleFocusTimerPress}>
        <Text style={styles.buttonText}>Start Focus Timer</Text>
      </TouchableOpacity> */}

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
              routine: item.routine,
              time: item.time.toString(),
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
  // button: {
  //   backgroundColor: '#4e6ab0',
  //   paddingVertical: 14,
  //   paddingHorizontal: 20,
  //   borderRadius: 10,
  //   elevation: 2,
  //   shadowColor: '#000',
  //   shadowOpacity: 0.15,
  //   shadowOffset: { width: 0, height: 3 },
  //   shadowRadius: 5,
  // },
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
});
