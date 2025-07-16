import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Button,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

type Message = {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  created_at: string;
};

export default function ChatPage() {
  const { friendId, friendUsername } = useLocalSearchParams<{
    friendId: string;
    friendUsername: string;
  }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');

  // Friend data
  const [avgSleep, setAvgSleep] = useState<number | null>(null);
  const [topTaskCategory, setTopTaskCategory] = useState<string>('–');
  const [totalPoints, setTotalPoints] = useState<number>(0);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: userData, error } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user || error) return;

    setUserId(user.id);
    fetchChatMessages(user.id);
    fetchFriendSleepData();
    fetchFriendTaskData();
  }

  async function fetchChatMessages(currentUserId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender.eq.${currentUserId},receiver.eq.${friendId}),and(sender.eq.${friendId},receiver.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });
  
    if (error) {
      console.error('Error fetching messages:', error.message);
    }
  
    if (data) {
      setMessages(data);
    }
  }

  async function fetchFriendSleepData() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6); // past 7 days

    const { data, error } = await supabase
      .from('sleep_data')
      .select('duration_slept, sleep_date')
      .eq('user_id', friendId)
      .gte('sleep_date', start.toISOString());

    if (data && data.length > 0) {
      const total = data.reduce((sum, d) => sum + d.duration_slept, 0);
      setAvgSleep(total / data.length);
    } else {
      setAvgSleep(null);
    }
  }

  async function fetchFriendTaskData() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7);

    const { data, error } = await supabase
      .from('tasks_completed')
      .select('category, points_earned')
      .eq('user_id', friendId)
      .gte('completed_time', start.toISOString());

    if (data && data.length > 0) {
      // Total points
      const points = data.reduce((sum, t) => sum + t.points_earned, 0);
      setTotalPoints(points);

      // Most frequent category
      const categoryCount: Record<string, number> = {};
      data.forEach((t) => {
        const cat = t.category || 'Uncategorized';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });

      const top = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
      setTopTaskCategory(top?.[0] || '–');
    } else {
      setTotalPoints(0);
      setTopTaskCategory('–');
    }
  }

  async function sendMessage() {
    if (!userId || !message.trim()) return;

    await supabase.from('messages').insert([
      {
        sender: userId,
        receiver: friendId,
        text: message.trim(),
      },
    ]);

    setMessage('');
    fetchChatMessages(userId);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <Text style={styles.header}>Chat with {friendUsername}</Text>

          <View style={styles.statsBox}>
            <Text style={styles.statsText}>
              Avg Sleep (past 7 days):{' '}
              {avgSleep !== null ? `${avgSleep.toFixed(1)} hrs` : 'No data'}
            </Text>
            <Text style={styles.statsText}>Top Task Category: {topTaskCategory}</Text>
            <Text style={styles.statsText}>Total Task Points: {totalPoints}</Text>
          </View>

          <ScrollView
            style={[styles.chatBox, { flex: 1 }]}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && (
              <Text style={styles.noMessages}>No messages yet, start chatting!</Text>
            )}
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.sender === userId ? styles.myMessage : styles.theirMessage,
                ]}
              >
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              style={styles.input}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <Button title="Send" onPress={sendMessage} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#816ec7',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  header: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statsBox: {
    backgroundColor: '#a899e6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  statsText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 2,
  },
  chatBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  noMessages: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 8,
    maxWidth: '80%',
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#d1c4e9',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  inputWrapper: {
    backgroundColor: '#816ec7',
    paddingBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    maxHeight: 100,
  },
});