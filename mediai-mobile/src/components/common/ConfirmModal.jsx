// src/components/common/ConfirmModal.jsx
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../styles/globalStyles';

export default function ConfirmModal({ visible, title, message, onConfirm, onCancel, confirmText = 'Confirmer', cancelText = 'Annuler', type = 'confirm' }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={[styles.iconContainer, type === 'danger' && styles.dangerIcon]}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirmButton, type === 'danger' && styles.dangerButton]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.white, borderRadius: 24, padding: 24, width: '80%', alignItems: 'center' },
  iconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  dangerIcon: { backgroundColor: colors.warnBg },
  icon: { fontSize: 28 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: colors.muted, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  buttons: { flexDirection: 'row', gap: 12, width: '100%' },
  button: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.border },
  confirmButton: { backgroundColor: colors.green },
  dangerButton: { backgroundColor: colors.warn },
  cancelText: { fontSize: 14, fontWeight: '500', color: colors.text },
  confirmText: { fontSize: 14, fontWeight: '600', color: colors.white },
});