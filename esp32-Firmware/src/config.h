#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ═══════════════════════════════════════════════════════════════
//  IDENTIFICATION DE L'APPAREIL
// ═══════════════════════════════════════════════════════════════
#define DEVICE_NAME         "MediAI Band Pro"   // Nom annoncé en BLE (doit matcher l'app mobile)
#define FIRMWARE_VERSION    "2.0.0"

// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION DES BROCHES GPIO
// ═══════════════════════════════════════════════════════════════
// Bus I2C partagé MLX90614 + MAX30102
#define I2C_SDA             21      // GPIO21 - Data I2C
#define I2C_SCL             22      // GPIO22 - Clock I2C

// ═══════════════════════════════════════════════════════════════
//  TIMING ET INTERVALLES
// ═══════════════════════════════════════════════════════════════
#define SYNC_INTERVAL_MS        2000    // Envoi BLE toutes les 2 secondes
#define SENSOR_READ_INTERVAL_MS 1000    // Lecture capteurs toutes les 1 seconde

// ═══════════════════════════════════════════════════════════════
//  UUIDs BLUETOOTH LOW ENERGY (BLE)
//  ⚠️ DOIVENT CORRESPONDRE À L'APPLICATION MOBILE (BiometricContext.jsx)
//  Le firmware n'expose qu'UNE caractéristique : les 3 métriques sont
//  transmises ensemble en JSON via CHAR_DATA (voir main.cpp / BLEService).
// ═══════════════════════════════════════════════════════════════
#define SERVICE_UUID            "19B10000-E8F2-537E-4F6C-D104768A1214"
#define CHAR_DATA_UUID          "19B10001-E8F2-537E-4F6C-D104768A1214"  // Données combinées (JSON)

// ═══════════════════════════════════════════════════════════════
//  SEUILS DE VALIDITÉ CAPTEUR (plausibilité physiologique)
//  Source UNIQUE de vérité des bornes utilisées par isValid*() et
//  main.cpp. L'interprétation clinique (fièvre, tachycardie…) est
//  faite côté backend, pas sur la band → aucun seuil d'alerte ici.
// ═══════════════════════════════════════════════════════════════
#define TEMP_MIN_VALID          30.0    // °C
#define TEMP_MAX_VALID          45.0

#define HR_MIN_VALID            30      // bpm
#define HR_MAX_VALID            220

#define SPO2_MIN_VALID          50      // %
#define SPO2_MAX_VALID          100

// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION DES CAPTEURS
// ═══════════════════════════════════════════════════════════════
// MLX90614 - Température infrarouge
#define MLX90614_I2C_ADDR       0x5A        // Adresse I2C par défaut
// Compensation peau → cœur (°C), appliquée sur TOUTE la plage physiologique.
// ⚠️ Estimation empirique et indicative, PAS une mesure médicale : à calibrer
//    sur le matériel réel. Unique source de vérité — utilisée par MLX90614_readTemperature().
#define MLX90614_TEMP_OFFSET    1.5

// MAX30102 - FC + SpO2 (paramètres de setup du capteur)
#define MAX30102_ADDR           0x57        // Adresse I2C par défaut
#define MAX30102_LED_BRIGHTNESS 0x1F        // Luminosité LED (0-255)
#define MAX30102_SAMPLE_AVG     4           // Moyenne sur 4 échantillons
#define MAX30102_SAMPLE_RATE    100         // Fréquence d'échantillonnage (Hz)
#define MAX30102_PULSE_WIDTH    411         // Largeur d'impulsion (µs)
#define MAX30102_ADC_RANGE      4096        // Plage ADC

// ═══════════════════════════════════════════════════════════════
//  FONCTIONS UTILITAIRES — validation des plages capteur
//  Utilisées par main.cpp : évite toute duplication de seuils.
// ═══════════════════════════════════════════════════════════════
inline bool isValidTemperature(float temp) {
  return (temp >= TEMP_MIN_VALID && temp <= TEMP_MAX_VALID);
}

inline bool isValidHeartRate(int hr) {
  return (hr >= HR_MIN_VALID && hr <= HR_MAX_VALID);
}

inline bool isValidSpO2(int spo2) {
  return (spo2 >= SPO2_MIN_VALID && spo2 <= SPO2_MAX_VALID);
}

// ═══════════════════════════════════════════════════════════════
//  CONSTANTES DE COMPILATION
// ═══════════════════════════════════════════════════════════════
#ifndef CORE_DEBUG_LEVEL
  #define CORE_DEBUG_LEVEL 3    // Niveau de debug ESP32 (0-5)
#endif

#endif // CONFIG_H
