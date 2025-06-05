import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function PlannerScreen() {
    const router = useRouter();
    const [routine, setRoutine] = useState('');
    const [time, setTime] = useState('');
    const [tasks, setTasks] = useState<{ id: string; routine: string; time: string }[]>([]);

  const handleFocusTimerPress = () => {
    router.push('../FocusTimer'); 
  };

function handleAddTask() {
  if (routine.trim() === '' || time.trim() === '') {
    return; 
  }

  const newTask = {
    id: String(Date.now()), 
    routine: routine,
    time: time,
  };


  const updatedTasks = tasks.concat(newTask);
  setTasks(updatedTasks);

  setRoutine('');
  setTime('');
}

function handleDeleteTask(id: string) {
  const updatedTasks = [];

  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id !== id) {
      updatedTasks.push(tasks[i]);
    }
  }

  setTasks(updatedTasks);
}

  return (
    <View style={styles.container2}>
      <Text style={styles.title}>Plan your day here!</Text>
      
      <TextInput
        placeholder="What do you want to do?"
        value={routine}
        onChangeText={setRoutine}
        style={styles.input}
        placeholderTextColor="#FFFFFF"
      />
      <TextInput
        placeholder="At what time? (e.g. 10:00 AM)"
        value={time}
        onChangeText={setTime}
        style={styles.input}
        placeholderTextColor="#FFFFFF"
      />

      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.buttonText}>Add Task</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleFocusTimerPress}>
        <Text style={styles.buttonText}>Start Focus Timer</Text>
      </TouchableOpacity>

            <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.task}>
            <Text style={styles.taskText}>
              • {item.routine} at {item.time}
            </Text>
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
  container2: {
    flex: 1,                     // fills the screen
    padding: 30,    // vertical center
    alignItems: 'center',        // horizontal center
    backgroundColor: '#816EC7',
  },
  title: {
    fontSize: 24,
    margin: 60,
    color: 'white',
  },
  button: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  addButton: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 15,
    width: '50%',
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
    borderRadius: 5, 
    borderColor: 'white'},
  task: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  taskText: {
    color: 'white',
    fontSize: 16,
  },
deleteButton: {
  backgroundColor: '#ff5c5c',
  paddingVertical: 5,
  paddingHorizontal: 10,
  borderRadius: 5,
},
deleteText: {
  color: 'white',
  fontWeight: 'bold',
},
});
