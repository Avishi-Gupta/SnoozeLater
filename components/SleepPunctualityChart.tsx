
import React from 'react';
import { Dimensions, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

type PunctualityData = {
  date: string;
  sleepDiff: number; 
  wakeDiff: number;  
};

export default function SleepPunctualityChart({ data }: { data: PunctualityData[] }) {
  const screenWidth = Dimensions.get('window').width;

//   const labels = data.map((d) => d.date.split(',')[0]); 
//   const sleepOffsets = data.map((d) => d.sleepDiff);
//   const wakeOffsets = data.map((d) => d.wakeDiff);

    const chartLabels: string[] = [];
    const chartValues: number[] = [];

    data.forEach(d => {
    chartLabels.push(`${d.date.split(',')[0]} S`);
    chartValues.push(d.sleepDiff/60);
    chartLabels.push(`${d.date.split(',')[0]} W`);
    chartValues.push(d.wakeDiff/60);
    });

  return (
    <View style={{ marginVertical: 16 }}>
      <BarChart
        data={{
       labels: chartLabels,
       datasets: [{ data: chartValues }],
        }}
        width={screenWidth - 40}
        height={220}
        yAxisLabel=""
        yAxisSuffix="m"
        fromZero
        chartConfig={{
          backgroundGradientFrom: 'white',
          backgroundGradientTo: 'white',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(0, 0, 200, ${opacity})`,
          labelColor: () => 'black',
        }}
        style={{
          borderRadius: 8,
          marginLeft: 0,
        }}
        verticalLabelRotation={0}
      />
    </View>
  );
}
