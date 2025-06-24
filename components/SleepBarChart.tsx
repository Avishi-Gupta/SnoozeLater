import * as scale from 'd3-scale';
import React from 'react';
import { Text, View } from 'react-native';
import { Text as SvgText } from 'react-native-svg';
import { BarChart, Grid, XAxis } from 'react-native-svg-charts';

type SleepEntry = {
  date: string;    // ISO or readable date
  hours: number;   // sleep duration in hours
};

type Props = {
  data: SleepEntry[];
};

export default function SleepBarChart({ data }: Props) {
  const barData = data.map((item) => item.hours);
  const dates = data.map((item) => item.date.slice(5)); // e.g., '06-21'

  // ✅ Strongly typed Labels component
  const Labels = ({
    x,
    y,
    bandwidth,
    data,
  }: {
    x: (index: number) => number;
    y: (value: number) => number;
    bandwidth: number;
    data: number[];
  }) => (
    <>
      {data.map((value, index) => (
        <SvgText
          key={index}
          x={x(index) + bandwidth / 2}
          y={y(value) - 8}
          fontSize={12}
          fill="black"
          alignmentBaseline="middle"
          textAnchor="middle"
        >
          {value.toFixed(1)}
        </SvgText>
      ))}
    </>
  );

  return (
    <View style={{ height: 250, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>
        💤 Sleep Duration (hrs)
      </Text>

      <BarChart
        style={{ height: 200 }}
        data={barData}
        svg={{ fill: '#a0c4ff' }}
        spacingInner={0.3}
        gridMin={0}
        contentInset={{ top: 10, bottom: 10 }}
      >
        <Grid direction={Grid.Direction.HORIZONTAL} />
        <Labels x={() => 0} y={() => 0} bandwidth={0} data={[]} /> {/* actual props injected internally */}
      </BarChart>

      <XAxis
        style={{ marginTop: 10 }}
        data={barData}
        scale={scale.scaleBand}
        formatLabel={(_value: unknown, index: number) => dates[index]}
        labelStyle={{ color: 'black' }}
      />
    </View>
  );
}