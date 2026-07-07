// src/components/biometric/RealTimeChart.jsx - VERSION CORRIGÉE
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { colors } from '../../styles/globalStyles';

const getChartColor = (metric) => {
  switch (metric) {
    case 'temp': return '#f97316';
    case 'hr': return '#ef4444';
    case 'spo2': return '#0ea5e9';
    case 'bp': return '#7c3aed';
    case 'glyc': return '#f59e0b';
    case 'resp': return '#10b981';
    default: return colors.green;
  }
};

export default function RealTimeChart({ metric, value, isHistory = false }) {
  const chartColor = getChartColor(metric);
  
  const getPoints = () => {
    if (isHistory) {
      return "0,50 20,48 40,45 60,44 80,42 100,40 120,38 140,35 160,30 180,28 200,25 220,22 240,20 260,18 280,15 300,12";
    }
    const baseValue = value || 50;
    const offset = 50 - (baseValue / 2);
    return `0,${offset + 5} 150,${offset + 2} 300,${offset}`;
  };

  const pointsArray = getPoints();
  const pathForGradient = `${pointsArray} 300,60 0,60`;

  return (
    <View style={styles.container}>
      <Svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={chartColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Polyline
          fill="url(#chartGrad)"
          stroke="none"
          points={pathForGradient}
        />
        <Polyline
          fill="none"
          stroke={chartColor}
          strokeWidth="2"
          strokeLinecap="round"
          points={pointsArray}
        />
        <Circle cx="295" cy="12" r="4" fill={chartColor} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 60, marginTop: 6 },
});