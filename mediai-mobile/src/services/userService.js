// src/services/userService.js - VERSION COMPLÈTE ET FINALE
import { storeUserData, getUserData as getStoredUserData } from '../utils/storage';

// ============================================
// BASE DE DONNÉES UTILISATEURS
// ============================================
let USERS_DB = [
  {
    id: 1,
    name: 'Jean-Paul Mbarga',
    email: 'jean@example.com',
    password: 'password123',
    phone: '+237 6XX XXX XXX',
    birthDate: '1990-03-12',
    age: 36,
    sexe: 'M',
    location: 'Yaoundé, Cameroun',
    bloodType: 'A+',
    allergies: 'Pénicilline',
    antecedents: 'Aucun',
    role: 'patient',
    consultations: 7,
    appointments: 2,
    diagnostics: [
      { id: 1, disease: 'Paludisme', score: 87, date: '2026-05-18', symptoms: ['Fièvre', 'Frissons'] },
      { id: 2, disease: 'Grippe', score: 72, date: '2026-05-14', symptoms: ['Fièvre', 'Toux'] }
    ]
  },
  {
    id: 2,
    name: 'Dr. Admin System',
    email: 'admin@mediai.com',
    password: 'admin123',
    phone: '+237 6AA AAA AA',
    birthDate: '1985-01-01',
    age: 41,
    sexe: 'M',
    location: 'Douala, Cameroun',
    bloodType: 'O+',
    allergies: 'Aucune',
    antecedents: 'Aucun',
    role: 'admin',
    consultations: 0,
    appointments: 0,
    diagnostics: []
  },
  {
    id: 3,
    name: 'Marie Claire',
    email: 'marie@example.com',
    password: 'marie123',
    phone: '+237 6YY YYY YY',
    birthDate: '1995-07-22',
    age: 30,
    sexe: 'F',
    location: 'Yaoundé, Cameroun',
    bloodType: 'B+',
    allergies: 'Aucune',
    antecedents: 'Asthme',
    role: 'patient',
    consultations: 3,
    appointments: 1,
    diagnostics: [
      { id: 3, disease: 'Gastro-entérite', score: 91, date: '2026-05-09', symptoms: ['Diarrhée', 'Vomissements'] }
    ]
  },
  {
    id: 4,
    name: 'Dr. Sarah Mendoua',
    email: 'medecin@mediai.com',
    password: 'medecin123',
    phone: '+237 6ZZ ZZZ ZZ',
    birthDate: '1988-05-15',
    age: 38,
    sexe: 'F',
    location: 'Douala, Cameroun',
    bloodType: 'O+',
    allergies: 'Aucune',
    antecedents: 'Aucun',
    role: 'medecin',
    consultations: 0,
    appointments: 0,
    diagnostics: []
  }
];

// ============================================
// BASE DE DONNÉES DES RENDEZ-VOUS
// ============================================
let appointmentsDB = [
  {
    id: 1,
    doctorId: 1,
    doctorName: 'Dr. Amina Fouda',
    specialty: 'Infectiologue',
    slot: '10h00',
    date: '2026-06-03',
    userId: 1,
    userName: 'Jean-Paul Mbarga',
    status: 'confirmed',
    createdAt: '2026-06-01T10:00:00.000Z'
  },
  {
    id: 2,
    doctorId: 2,
    doctorName: 'Dr. Samuel Nkeng',
    specialty: 'Médecin généraliste',
    slot: '14h30',
    date: '2026-06-05',
    userId: 1,
    userName: 'Jean-Paul Mbarga',
    status: 'confirmed',
    createdAt: '2026-06-01T11:00:00.000Z'
  },
  {
    id: 3,
    doctorId: 3,
    doctorName: 'Dr. Claire Mvogo',
    specialty: 'Pédiatre',
    slot: '09h00',
    date: '2026-06-10',
    userId: 3,
    userName: 'Marie Claire',
    status: 'confirmed',
    createdAt: '2026-06-01T12:00:00.000Z'
  },
  {
    id: 4,
    doctorId: 1,
    doctorName: 'Dr. Amina Fouda',
    specialty: 'Infectiologue',
    slot: '15h00',
    date: '2026-06-12',
    userId: 3,
    userName: 'Marie Claire',
    status: 'confirmed',
    createdAt: '2026-06-01T13:00:00.000Z'
  },
  {
    id: 5,
    doctorId: 4,
    doctorName: 'Dr. Pierre Nganou',
    specialty: 'Cardiologue',
    slot: '11h30',
    date: '2026-06-08',
    userId: 1,
    userName: 'Jean-Paul Mbarga',
    status: 'confirmed',
    createdAt: '2026-06-01T14:00:00.000Z'
  },
  {
    id: 6,
    doctorId: 2,
    doctorName: 'Dr. Samuel Nkeng',
    specialty: 'Médecin généraliste',
    slot: '08h30',
    date: '2026-06-15',
    userId: 4,
    userName: 'Dr. Sarah Mendoua',
    status: 'confirmed',
    createdAt: '2026-06-01T15:00:00.000Z'
  },
  {
    id: 7,
    doctorId: 3,
    doctorName: 'Dr. Claire Mvogo',
    specialty: 'Pédiatre',
    slot: '14h00',
    date: '2026-06-07',
    userId: 2,
    userName: 'Dr. Admin System',
    status: 'confirmed',
    createdAt: '2026-06-01T16:00:00.000Z'
  }
];

// ============================================
// FONCTIONS UTILISATEURS
// ============================================

// Récupérer tous les utilisateurs (sans mots de passe)
export const getAllUsers = async () => {
  return USERS_DB.map(({ password, ...user }) => user);
};

// Récupérer un utilisateur par ID
export const getUserById = async (userId) => {
  const user = USERS_DB.find(u => u.id === userId);
  if (user) {
    const { password, ...userData } = user;
    return userData;
  }
  return null;
};

// Mettre à jour un utilisateur
export const updateUser = async (userId, userData) => {
  const index = USERS_DB.findIndex(u => u.id === userId);
  if (index !== -1) {
    const existingPassword = USERS_DB[index].password;
    USERS_DB[index] = { ...USERS_DB[index], ...userData, password: existingPassword };
    const { password, ...updatedUser } = USERS_DB[index];
    
    // Mettre à jour le stockage local si c'est l'utilisateur actuel
    const currentUser = await getStoredUserData();
    if (currentUser?.id === userId) {
      await storeUserData(updatedUser);
    }
    return updatedUser;
  }
  return null;
};

// Modifier le rôle d'un utilisateur (admin uniquement)
export const updateUserRole = async (userId, newRole) => {
  const index = USERS_DB.findIndex(u => u.id === userId);
  if (index !== -1) {
    USERS_DB[index].role = newRole;
    const { password, ...updatedUser } = USERS_DB[index];
    
    // Mettre à jour le stockage local si c'est l'utilisateur actuel
    const currentUser = await getStoredUserData();
    if (currentUser?.id === userId) {
      await storeUserData(updatedUser);
    }
    return updatedUser;
  }
  return null;
};

// Ajouter un diagnostic pour un utilisateur
export const addDiagnostic = async (userId, diagnostic) => {
  const index = USERS_DB.findIndex(u => u.id === userId);
  if (index !== -1) {
    const newDiagnostic = {
      id: Date.now(),
      ...diagnostic,
      date: new Date().toISOString().split('T')[0]
    };
    USERS_DB[index].diagnostics = [newDiagnostic, ...(USERS_DB[index].diagnostics || [])];
    USERS_DB[index].consultations = (USERS_DB[index].consultations || 0) + 1;
    
    // Mettre à jour le stockage local si c'est l'utilisateur actuel
    const currentUser = await getStoredUserData();
    if (currentUser?.id === userId) {
      const { password, ...updatedUser } = USERS_DB[index];
      await storeUserData(updatedUser);
    }
    return newDiagnostic;
  }
  return null;
};

// Récupérer les diagnostics d'un utilisateur
export const getUserDiagnostics = async (userId) => {
  const user = USERS_DB.find(u => u.id === userId);
  return user?.diagnostics || [];
};

// Connexion
export const loginUser = async (email, password) => {
  const user = USERS_DB.find(u => u.email === email && u.password === password);
  if (user) {
    const { password: _, ...userData } = user;
    return { success: true, user: userData };
  }
  return { success: false, error: 'Email ou mot de passe incorrect' };
};

// Inscription
export const registerUser = async (userData) => {
  const existingUser = USERS_DB.find(u => u.email === userData.email);
  if (existingUser) {
    return { success: false, error: 'Cet email est déjà utilisé' };
  }
  
  const newUser = {
    id: USERS_DB.length + 1,
    ...userData,
    role: 'patient',
    consultations: 0,
    appointments: 0,
    diagnostics: []
  };
  
  USERS_DB.push(newUser);
  const { password, ...newUserData } = newUser;
  return { success: true, user: newUserData };
};

// ============================================
// FONCTIONS RENDEZ-VOUS
// ============================================

// Récupérer tous les rendez-vous (pour admin)
export const getAllAppointments = async () => {
  return appointmentsDB.filter(apt => apt.status === 'confirmed');
};

// Récupérer les rendez-vous d'un utilisateur
export const getUserAppointments = async (userId) => {
  return appointmentsDB.filter(apt => apt.userId === userId && apt.status === 'confirmed');
};

// Ajouter un rendez-vous
export const addAppointment = async (appointment) => {
  const newAppointment = {
    id: appointmentsDB.length + 1,
    ...appointment,
    createdAt: new Date().toISOString(),
    status: 'confirmed'
  };
  appointmentsDB.push(newAppointment);
  
  // Mettre à jour le compteur de rendez-vous de l'utilisateur
  const userIndex = USERS_DB.findIndex(u => u.id === appointment.userId);
  if (userIndex !== -1) {
    USERS_DB[userIndex].appointments = (USERS_DB[userIndex].appointments || 0) + 1;
    
    // Mettre à jour le stockage local si c'est l'utilisateur actuel
    const currentUser = await getStoredUserData();
    if (currentUser?.id === appointment.userId) {
      const { password, ...updatedUser } = USERS_DB[userIndex];
      await storeUserData(updatedUser);
    }
  }
  
  return newAppointment;
};

// Annuler un rendez-vous
export const cancelAppointment = async (appointmentId, userId) => {
  const index = appointmentsDB.findIndex(apt => apt.id === appointmentId);
  if (index !== -1) {
    appointmentsDB[index].status = 'cancelled';
    
    // Mettre à jour le compteur de rendez-vous de l'utilisateur
    const userIndex = USERS_DB.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      USERS_DB[userIndex].appointments = Math.max((USERS_DB[userIndex].appointments || 0) - 1, 0);
      
      // Mettre à jour le stockage local si c'est l'utilisateur actuel
      const currentUser = await getStoredUserData();
      if (currentUser?.id === userId) {
        const { password, ...updatedUser } = USERS_DB[userIndex];
        await storeUserData(updatedUser);
      }
    }
    return true;
  }
  return false;
};

// ============================================
// FONCTIONS STATISTIQUES
// ============================================

// Récupérer les statistiques globales
export const getStatistics = async () => {
  const totalUsers = USERS_DB.length;
  const totalConsultations = USERS_DB.reduce((sum, u) => sum + (u.consultations || 0), 0);
  const totalAppointments = appointmentsDB.filter(apt => apt.status === 'confirmed').length;
  const patientsCount = USERS_DB.filter(u => u.role === 'patient').length;
  const medecinsCount = USERS_DB.filter(u => u.role === 'medecin').length;
  const adminsCount = USERS_DB.filter(u => u.role === 'admin').length;
  
  // Compter les maladies les plus fréquentes
  const diseasesCount = {};
  USERS_DB.forEach(user => {
    (user.diagnostics || []).forEach(diag => {
      diseasesCount[diag.disease] = (diseasesCount[diag.disease] || 0) + 1;
    });
  });
  
  const topDiseases = Object.entries(diseasesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  
  return {
    totalUsers,
    totalConsultations,
    totalAppointments,
    patientsCount,
    medecinsCount,
    adminsCount,
    topDiseases
  };
};

// ============================================
// FONCTIONS D'EXPORT
// ============================================

// Exporter toutes les données (pour admin)
export const exportAllData = async () => {
  const users = await getAllUsers();
  const appointments = await getAllAppointments();
  const statistics = await getStatistics();
  
  return {
    exportDate: new Date().toISOString(),
    statistics,
    users,
    appointments
  };
};