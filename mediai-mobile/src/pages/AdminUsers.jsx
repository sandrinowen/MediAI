// src/pages/AdminUsers.jsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { colors } from '../styles/globalStyles';
import { getAllUsers } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/roles';
import Toast from '../components/common/Toast';

export default function AdminUsers({ navigation }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [error, setError] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    const result = await getAllUsers();
    if (result.success) {
      setUsers(result.users);
    } else {
      setUsers([]);
      setError(result.error);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadUsers();
    const unsubscribe = navigation.addListener('focus', () => loadUsers());
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ height: 34 }} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Gestion utilisateurs</Text>
        </View>
        <View style={styles.placeholder}><Text style={styles.placeholderEmoji}>⏳</Text><Text style={styles.placeholderText}>Chargement...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      
      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👥 Utilisateurs</Text>
        <Text style={styles.subtitle}>{users.length} inscrit(s)</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}
      >
        {error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Chargement impossible</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucun utilisateur</Text>
            <Text style={styles.stateText}>Aucun compte n'est enregistré pour le moment.</Text>
          </View>
        ) : null}
        {!error && users.map(user => (
          <TouchableOpacity 
            key={user.id} 
            style={styles.userCard} 
            onPress={() => navigation.navigate('UserDetail', { userId: user.id })}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarEmoji}>{user.sexe === 'F' ? '👩' : '👤'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={[styles.userBadge, { backgroundColor: ROLE_LABELS[user.role]?.bgColor || '#f0f0f0' }]}>
                <Text style={[styles.userBadgeText, { color: ROLE_LABELS[user.role]?.color || colors.muted }]}>
                  {ROLE_LABELS[user.role]?.label || '👤 Utilisateur'}
                </Text>
              </View>
            </View>
            <Text style={styles.userArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingBottom: 20, backgroundColor: colors.green, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 20, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji: { fontSize: 48, marginBottom: 12 },
  placeholderText: { fontSize: 14, color: colors.muted },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userAvatarEmoji: { fontSize: 24 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: 11, color: colors.muted, marginTop: 2 },
  userBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4 },
  userBadgeText: { fontSize: 9, fontWeight: '500' },
  userArrow: { fontSize: 16, color: colors.muted },
});