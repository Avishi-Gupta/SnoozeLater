import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

type PunctualityData = {
  date: string;
  sleepDiff: number;
  wakeDiff: number;
};

const chartConfig = {
  backgroundGradientFrom: 'white',
  backgroundGradientTo: 'white',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
  labelColor: () => 'black',
  propsForBackgroundLines: {
    stroke: '#eee',
  },
};

const screenWidth = Dimensions.get('window').width;

export default function PunctualityBarCharts({ data }: { data: PunctualityData[] }) {
  const labels = data.map((d) =>
  new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
);
  const sleepData = data.map((d) => d.sleepDiff);
  const wakeData = data.map((d) => d.wakeDiff);

  return (
    <View style={{ margin: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: 'white' }}>
        Sleep Time Punctuality (in minutes)
      </Text>
      <BarChart
              data={{
                  labels,
                  datasets: [{ data: sleepData }],
              }}
              width={screenWidth - 32}
              height={220}
              fromZero
              yAxisSuffix="m"
              chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, 
              }}
              style={{ borderRadius: 8 }} yAxisLabel={''}      />

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 8, color: 'white' }}>
        Wake Time Punctuality (in minutes)
      </Text>
      <BarChart
              data={{
                  labels,
                  datasets: [{ data: wakeData }],
              }}
              width={screenWidth - 32}
              height={220}
              fromZero
              yAxisSuffix="m"
              chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, 
              }}
              style={{ borderRadius: 8 }} yAxisLabel={''}      />
    </View>
  );
}
