// src/components/common/Toast.jsx
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors } from '../../styles/globalStyles';

export default function Toast({ message, type = 'success', visible, onHide }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide && onHide());
    }
  }, [visible]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return colors.green;
      case 'error': return '#dc2626';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return colors.green;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '✓';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.icon}>{getIcon()}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});