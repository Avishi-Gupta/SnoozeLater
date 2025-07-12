// import { Tabs } from 'expo-router';
// import React from 'react';
// import { Platform } from 'react-native';
// import { HapticTab } from '@/components/HapticTab';
// import { IconSymbol } from '@/components/ui/IconSymbol';
// import TabBarBackground from '@/components/ui/TabBarBackground';
// import { Colors } from '@/constants/Colors';
// import { useColorScheme } from '@/hooks/useColorScheme';

// export default function TabLayout() {
//   const colorScheme = useColorScheme();

//   return (
//     <Tabs
//       screenOptions={{
//         tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
//         headerShown: false,
//         tabBarButton: HapticTab,
//         tabBarBackground: TabBarBackground,
//         tabBarStyle: Platform.select({
//           ios: {
//             // Use a transparent background on iOS to show the blur effect
//             position: 'absolute',
//           },
//           default: {},
//         }),
//       }}>

//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Profile',
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.circle.fill" color={color} />,
//         }}
//       />

//       <Tabs.Screen
//         name="DailyPlanner"
//         options={{
//           title: 'Planner',
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
//         }}
//       />
//             <Tabs.Screen
//         name="SleepTimer"
//         options={{
//           title: 'Sleep Tracker',
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="moon.fill" color={color} />,
//         }}
//       />
//             <Tabs.Screen
//         name="Leaderboard"
//         options={{
//           title: 'Leaderboard',
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="medal.fill" color={color} />,
//         }}
//       />
//             <Tabs.Screen
//         name="WeeklyInsights"
//         options={{
//           title: 'Insights',
//           tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
//         }}
//       />
//     </Tabs>
//   );
// }

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
    </Tabs>
  );
}
