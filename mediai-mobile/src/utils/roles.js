// src/utils/roles.js
export const ROLES = { ADMIN: 'admin', MEDECIN: 'medecin', PATIENT: 'patient' };

export const ROLE_LABELS = {
  [ROLES.ADMIN]: { label: '🔐 Administrateur', color: '#dc2626', bgColor: '#fee2e2' },
  [ROLES.MEDECIN]: { label: '👨‍⚕️ Médecin', color: '#3b82f6', bgColor: '#dbeafe' },
  [ROLES.PATIENT]: { label: '👤 Patient', color: '#10b981', bgColor: '#d1fae5' }
};

export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Administrateur', description: 'Accès total' },
  { value: ROLES.MEDECIN, label: 'Médecin', description: 'Accès patients' },
  { value: ROLES.PATIENT, label: 'Patient', description: 'Accès personnel' }
];

export const isAdmin = (user) => user?.role === ROLES.ADMIN;
export const isMedecin = (user) => user?.role === ROLES.MEDECIN;
export const isPatient = (user) => user?.role === ROLES.PATIENT;
export const canModifyRole = (user) => isAdmin(user);
export const getRoleLabel = (role) => ROLE_LABELS[role]?.label || '👤 Utilisateur';
export const getRoleColor = (role) => ROLE_LABELS[role]?.color;