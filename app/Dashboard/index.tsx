import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.log('Error logging out:', error.message);
  } else {
    router.replace('/login'); 
  }
};
  return (
    <View style={styles.container}>

      <Text style={styles.title}>Welcome to the Home Screen!</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 60, alignItems: 'center', backgroundColor: '#816ec7' },
  title: { fontSize: 20, marginBottom: 20, color: 'white' },
    button: {
    backgroundColor: '#4e6ab0',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});