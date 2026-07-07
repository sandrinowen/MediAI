// src/Routes.jsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { AuthProvider, useAuth } from './context/AuthContext';
import { BiometricProvider } from './context/BiometricContext';
import { navigationRef } from './services/navigationRef';
import Loader from './components/common/Loader';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import DiagnosticChat from './pages/DiagnosticChat';
import Results from './pages/Results';
import History from './pages/History';
import Appointments from './pages/Appointments';
import MedicalRecord from './pages/MedicalRecord';
import Carnet from './pages/Carnet';
import DiagnosticDetail from './pages/DiagnosticDetail';
import Profile from './pages/Profile';
import Biometric from './pages/Biometric';
import AdminUsers from './pages/AdminUsers';
import AdminStatistics from './pages/AdminStatistics';
import UserDetail from './pages/UserDetail';
import DoctorSchedule from './pages/DoctorSchedule';
import DoctorConsultations from './pages/DoctorConsultations';

import { colors } from './styles/globalStyles';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = {
  Accueil: ['home-outline', 'home'],
  Capteurs: ['hardware-chip-outline', 'hardware-chip'],
  ChatIA: ['medkit-outline', 'medkit'],
  Carnet: ['book-outline', 'book'],
  Historique: ['time-outline', 'time'],
  Profil: ['person-outline', 'person'],
  Consultations: ['calendar-outline', 'calendar'],
  Horaires: ['calendar-number-outline', 'calendar-number'],
  Admin: ['shield-checkmark-outline', 'shield-checkmark'],
};

const PATIENT_TAB_ICONS = {
  Accueil: '🏠',
  Capteurs: '📡',
  ChatIA: '🧬',
  Carnet: '📔',
  Profil: '👤',
};

const ADMIN_TAB_ICONS = {
  Accueil: '🏠',
  Utilisateurs: '👥',
  Statistiques: '📊',
  Profil: '👤',
};

const DOCTOR_TAB_ICONS = {
  Accueil: '🏠',
  Horaires: '📅',
  Consultations: '🩺',
  Historique: '📋',
  Profil: '👤',
};

function MainTabs() {
  const { isMedecin, isAdmin } = useAuth();
  const isPatient = !isMedecin && !isAdmin;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const roleIcon = isPatient ? PATIENT_TAB_ICONS[route.name] : isAdmin ? ADMIN_TAB_ICONS[route.name] : DOCTOR_TAB_ICONS[route.name];
          if (roleIcon) {
            if ((isPatient && route.name === 'ChatIA') || (isMedecin && route.name === 'Consultations')) {
              return (
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    marginTop: -12,
                    backgroundColor: colors.green,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: colors.green,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 8,
                    transform: [{ scale: focused ? 1.05 : 1 }],
                  }}
                >
                  <Text style={{ fontSize: 24, lineHeight: 28 }}>{roleIcon}</Text>
                </View>
              );
            }

            return (
              <Text
                style={{
                  fontSize: 22,
                  lineHeight: 24,
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              >
                {roleIcon}
              </Text>
            );
          }

          const [outline, filled] = ICONS[route.name] || ICONS.Accueil;
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarStyle: { height: 70, paddingBottom: 10, paddingTop: 5 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Accueil" component={Home} />
      {isMedecin ? (
        <>
          <Tab.Screen name="Horaires" component={DoctorSchedule} />
          <Tab.Screen name="Consultations" component={DoctorConsultations} />
          <Tab.Screen name="Historique" component={History} />
        </>
      ) : isAdmin ? (
        <>
          <Tab.Screen name="Utilisateurs" component={AdminUsers} />
          <Tab.Screen name="Statistiques" component={AdminStatistics} />
        </>
      ) : (
        <>
          <Tab.Screen name="Capteurs" component={Biometric} />
          <Tab.Screen name="ChatIA" component={DiagnosticChat} options={{ title: 'Diagnostic' }} />
          <Tab.Screen name="Carnet" component={Carnet} />
        </>
      )}
      <Tab.Screen name="Profil" component={Profile} />
    </Tab.Navigator>
  );
}

function AppStack() {
  const { isMedecin, isAdmin } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Results" component={Results} />
      <Stack.Screen name="DiagnosticChat" component={DiagnosticChat} />
      <Stack.Screen name="MedicalRecord" component={MedicalRecord} />
      <Stack.Screen name="DiagnosticDetail" component={DiagnosticDetail} />
      <Stack.Screen name="CarnetDetail" component={DiagnosticDetail} />
      <Stack.Screen name="Appointments" component={Appointments} />
      {/* Patient : Carnet est un onglet ; médecin/admin y accèdent via la pile. */}
      {(isMedecin || isAdmin) && <Stack.Screen name="Carnet" component={Carnet} />}
      {isMedecin && <Stack.Screen name="DoctorSchedule" component={DoctorSchedule} />}
      {isMedecin && <Stack.Screen name="DoctorConsultations" component={DoctorConsultations} />}
      {isAdmin && <Stack.Screen name="AdminUsers" component={AdminUsers} />}
      {isAdmin && <Stack.Screen name="AdminStatistics" component={AdminStatistics} />}
      {isAdmin && <Stack.Screen name="UserDetail" component={UserDetail} />}
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    </Stack.Navigator>
  );
}

function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loader visible={true} text="Chargement..." />;
  return isAuthenticated ? <AppStack /> : <AuthStack />;
}

export default function Routes() {
  return (
    <NavigationContainer ref={navigationRef}>
      <AuthProvider>
        <BiometricProvider>
          <Navigation />
        </BiometricProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}
