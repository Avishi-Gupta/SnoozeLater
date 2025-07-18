import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type BadgeProps = {
  badgeKeys: string[];
};

const BADGE_DEFINITIONS: Record<
  string,
  { icon: JSX.Element; label: string }
> = {
  earlyBird: {
    icon: <Ionicons name="sunny" size={20} color="#FFD700" />,
    label: 'Early Bird',
  },
  studious: {
    icon: <MaterialCommunityIcons
      name="book-open-page-variant"
      size={20}
      color="#4caf50"
    />,
    label: 'Studious',
  },
  nightOwl: {
    icon: <Ionicons name="moon" size={20} color="#673ab7" />,
    label: 'Night Owl',
  },
  marathoner: {
    icon: <MaterialCommunityIcons
      name="run-fast"
      size={20}
      color="#f44336"
    />,
    label: 'Marathoner',
  },
  perfectionist: {
    icon: <Ionicons name="checkmark-done-circle" size={20} color="#2196f3" />,
    label: 'Perfectionist',
  },
  multitasker: {
    icon: <MaterialCommunityIcons
      name="shuffle-variant"
      size={20}
      color="#ff9800"
    />,
    label: 'Multitasker',
  },
  socialButterfly: {
    icon: <Ionicons name="people" size={20} color="#e91e63" />,
    label: 'Social Butterfly',
  },
  earlyRiser: {
    icon: <Ionicons name="alarm" size={20} color="#9c27b0" />,
    label: 'Early Riser',
  },
  // Add more badges here as needed
};

export default function Badges({ badgeKeys }: BadgeProps) {
  if (!badgeKeys || badgeKeys.length === 0) {
    return <Text style={styles.noBadges}>No badges earned yet</Text>;
  }

  return (
    <View style={styles.badgesContainer}>
      {badgeKeys.map((key) => {
        const badge = BADGE_DEFINITIONS[key];
        if (!badge) return null;
        return (
          <View key={key} style={styles.badge}>
            {badge.icon}
            <Text style={styles.label}>{badge.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // For React Native >= 0.71
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  noBadges: {
    color: 'white',
    fontStyle: 'italic',
  },
});