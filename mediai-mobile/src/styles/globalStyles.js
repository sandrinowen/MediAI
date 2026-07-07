import { StyleSheet } from 'react-native';

export const colors = {
  green: '#2d6a4f',
  greenLight: '#52b788',
  greenPale: '#d8f3dc',
  mint: '#b7e4c7',
  cream: '#f5f7f2',
  white: '#ffffff',
  text: '#1b2e22',
  muted: '#6b8f71',
  border: '#d4e6d9',
  warn: '#e76f51',
  warnBg: '#fde8e1',
  yellow: '#f4a261',
  yellowBg: '#fef3e2',
  blue: '#0ea5e9',
  blueBg: '#e0f2fe',
  purple: '#7c3aed',
  purpleBg: '#ede9fe',
  red: '#ef4444',
  redBg: '#fee2e2',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: colors.green,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  section: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
});