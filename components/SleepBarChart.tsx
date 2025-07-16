import React from 'react';
import { Dimensions, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type Props = {
  data: {
    inserted_at: string;
    duration_slept: number;
  }[];
};

export default function SleepBarChart({ data }: Props) {
  const dailyMap = new Map<string, number>();

  for (const entry of data) {
    const date = new Date(entry.inserted_at);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const cappedDuration = Math.min(entry.duration_slept, 24);
    dailyMap.set(day, (dailyMap.get(day) || 0) + cappedDuration);
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const labels: string[] = [];
  const values: number[] = [];

  for (const day of weekDays) {
    labels.push(day);
    values.push(Math.min(dailyMap.get(day) || 0, 24));
  }

  const chartData = {
    labels,
    datasets: [{ data: values }],
  };

  return (
    <View style={{ marginTop: 10 }}>
      <LineChart
  data={chartData}
  width={screenWidth - 30}
  height={240}
  fromZero
  yAxisLabel=""
  yAxisSuffix="h"
  yLabelsOffset={8}
  segments={4}
  chartConfig={{
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 0, 200, ${opacity})`,
    labelColor: () => '#333',
    propsForLabels: {
      fontSize: 11,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#4e6ab0',
    },
  }}
  bezier
  style={{
    borderRadius: 8,
    marginLeft: 0,
  }}
/>
    </View>
  );
}