import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getUser();
      setSession(data ?? null);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUnreadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver', session.user.id)
        .eq('read', false);

      if (!error) {
        setUnreadCount(data.length);
      }
    };

    fetchUnreadMessages();

    const interval = setInterval(fetchUnreadMessages, 20000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="DailyPlanner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="SleepTimer"
        options={{
          title: 'Sleep Tracker',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="moon-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="Leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="WeeklyInsights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="SocialPage"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="people-circle-outline" size={size} color={color} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: -3,
                    backgroundColor: 'red',
                    borderRadius: 8,
                    width: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

    </Tabs>
  );
}
