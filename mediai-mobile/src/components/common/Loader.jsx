import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/globalStyles';

export default function Loader({ visible, text = 'Analyse en cours...' }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245,247,242,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderContainer: {
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
});