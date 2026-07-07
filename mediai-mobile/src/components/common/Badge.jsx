import { View, Text, StyleSheet } from 'react-native';

export default function Badge({ text, type = 'primary', style }) {
  const getStyle = () => {
    switch (type) {
      case 'urgent': return styles.urgent;
      case 'moderate': return styles.moderate;
      case 'mild': return styles.mild;
      default: return styles.primary;
    }
  };
  
  const getText = () => {
    switch (type) {
      case 'urgent': return '🟠 Urgent';
      case 'moderate': return '🟡 Modéré';
      case 'mild': return '🟢 Faible';
      default: return text;
    }
  };

  return (
    <View style={[styles.badge, getStyle(), style]}>
      <Text style={styles.text}>{getText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  primary: { backgroundColor: '#d8f3dc' },
  urgent: { backgroundColor: '#fde8e1' },
  moderate: { backgroundColor: '#fef3e2' },
  mild: { backgroundColor: '#d1fae5' },
  text: { fontSize: 10, fontWeight: '700' },
});