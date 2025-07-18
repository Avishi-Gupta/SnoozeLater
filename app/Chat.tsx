import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

type Message = {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  created_at: string;
  read: boolean;
};

function formatTimestamp(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

export default function ChatPage() {
  const { friendId, friendUsername } = useLocalSearchParams<{
    friendId: string;
    friendUsername: string;
  }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [badges, setBadges] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        if (!friendId) return;
  
        const { data: userData, error } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user || error) return;
  
        setUserId(user.id);
        await markMessagesAsRead(user.id, friendId);
        await fetchChatMessages(user.id);
        fetchFriendBadges(friendId);
      };
  
      run();
    }, [friendId])
  );

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

  async function markMessagesAsRead(currentUserId: string, friendId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .match({
        sender: friendId,
        receiver: currentUserId,
        read: false,
      });

    if (error) {
      console.error('Error marking messages as read:', error.message);
    }
  }

  async function fetchFriendBadges(friendId: string) {
    if (!friendId) {
      console.error('No friendId provided.');
      return;
    }
  
    const { data, error } = await supabase
      .from('profiles')
      .select('badges')
      .eq('id', friendId)
      .single();
  
    if (error) {
      console.error('Error fetching badges:', error.message);
      return;
    }
  
    if (data && Array.isArray(data.badges)) {
      setBadges(data.badges);
    } else {
      console.warn('No badges found or badges is not an array');
      setBadges([]);
    }
  }

  async function sendMessage() {
    if (!userId || !message.trim()) return;

    await supabase.from('messages').insert([
      {
        sender: userId,
        receiver: friendId,
        text: message.trim(),
        read: false,
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
          {/* Header with Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.header}>Chat with {friendUsername}</Text>
          </View>

          <View style={styles.statsBox}>
            <Text style={styles.statsText}>Badges Earned:</Text>
            {badges.length === 0 ? (
            <Text style={styles.statsText}>No badges yet.</Text>
            ) : (
              badges.map((badge, index) => (
              <Text key={index} style={styles.statsText}>🏅 {badge}</Text>
              ))
            )}
            </View>

          {/* Messages Scroll */}
          <ScrollView
      style={styles.chatBox}
      contentContainerStyle={{ paddingBottom: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {messages.length === 0 && (
        <Text style={styles.noMessages}>No messages yet, start chatting!</Text>
      )}
      {messages.map((msg, idx) => {
        const showTimestamp =
          idx === 0 ||
          (new Date(msg.created_at).getTime() -
            new Date(messages[idx - 1].created_at).getTime()) /
            1000 /
            60 >
            10; // more than 10 minutes difference

        return (
          <React.Fragment key={msg.id}>
            {showTimestamp && (
              <View style={styles.timestampContainer}>
                <Text style={styles.timestampText}>
                  {formatTimestamp(msg.created_at)}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                msg.sender === userId ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </ScrollView>

          {/* Input Row */}
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
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton} activeOpacity={0.7}>
              <Ionicons name="send" size={24} color="white" />
            </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 10,
    padding: 6,
  },
  header: {
    fontSize: 22,
    color: 'white',
    fontWeight: 'bold',
  },
  statsBox: {
    backgroundColor: '#a899e6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  statsText: {
    color: 'white',
    fontSize: 15,
    marginBottom: 4,
  },
  chatBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  noMessages: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
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
    color: '#222',
  },
  timestampContainer: {
    alignSelf: 'center',
    marginVertical: 8,
    backgroundColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timestampText: {
    fontSize: 12,
    color: '#555',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#5a4fcf',
    borderRadius: 20,
    padding: 12,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});