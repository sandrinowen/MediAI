// src/services/navigationRef.js
// Référence de navigation globale : permet de naviguer depuis l'extérieur
// des composants React (ex. au clic sur une notification push).
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
