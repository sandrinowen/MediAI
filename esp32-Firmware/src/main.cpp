#include <Arduino.h>
#include <Wire.h>
#include <ArduinoJson.h>

// Inclusion de nos modules
#include "config.h"
#include "sensors/MLX90614.h"
#include "sensors/MAX30102.h"
#include "ble/BLEService.h"

// ── Variables globales ──────────────────────────────────────
unsigned long lastSync = 0;
unsigned long lastSensorRead = 0;

// Structure données capteurs. Les valeurs ne sont émises que si leur
// flag *Valid est vrai (voir la construction du JSON dans loop()).
struct SensorData {
    float temperature = 0;      // °C  — significatif seulement si tempValid
    int heartRate = 0;          // bpm — significatif seulement si hrValid
    int spo2 = 0;               // %   — significatif seulement si spo2Valid
    int battery = 100;          // %   — non mesuré (voir readBatteryPercent)
    bool tempValid = false;
    bool hrValid = false;
    bool spo2Valid = false;
    unsigned long timestamp = 0;
};

SensorData data;

// ── Lecture batterie ────────────────────────────────────────
// ⚠️ Batterie NON mesurée : aucun circuit de lecture (pont diviseur + ADC)
//    n'est câblé sur cette révision matérielle. On rapporte donc une valeur
//    fixe assumée. Brancher la lecture ADC ici le jour où le HW le permet.
int readBatteryPercent() {
    return 100; // valeur fixe assumée (non mesurée)
}

// ── SETUP ───────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    Serial.println("\n");
    Serial.println("╔════════════════════════════════════════╗");
    Serial.println("║   🧬 MediAI Band Pro v2.0             ║");
    Serial.println("║   Capteurs: MLX90614 + MAX30102       ║");
    Serial.println("╚════════════════════════════════════════╝");
    
    // 1. Initialiser I2C
    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(100000); // 100kHz
    delay(100);
    
    // 2. Initialiser capteurs
    Serial.println("\n🔧 Initialisation des capteurs...");
    MLX90614_init();
    MAX30102_init();
    
    // 3. Initialiser BLE
    Serial.println("\n🔧 Initialisation BLE...");
    setupBLE();
    
    Serial.println("\n✅ MediAI Band Pro prêt !");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ── LOOP ────────────────────────────────────────────────────
void loop() {
    // 1. Lecture capteurs toutes les 2s
    if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
        
        // ── Température ─────────────────────────────────
        float temp = MLX90614_readTemperature();   // NAN si pas de mesure
        if (isValidTemperature(temp)) {
            data.temperature = temp;
            data.tempValid = true;
            Serial.printf("✅ Temp: %.1f°C\n", temp);
        } else {
            data.temperature = 0;
            data.tempValid = false;
            Serial.println("⚠️ Temp: pas de mesure valide");
        }
        
        // ── FC + SpO2 ───────────────────────────────────
        int hr = 0, spo2 = 0;
        MAX30102_read(&hr, &spo2);
        
        if (isValidHeartRate(hr)) {
            data.heartRate = hr;
            data.hrValid = true;
            Serial.printf("✅ FC: %d bpm\n", hr);
        } else {
            data.heartRate = 0;
            data.hrValid = false;
            Serial.println("⚠️ FC: pas de mesure valide");
        }
        
        if (isValidSpO2(spo2)) {
            data.spo2 = spo2;
            data.spo2Valid = true;
            Serial.printf("✅ SpO2: %d%%\n", spo2);
        } else {
            data.spo2 = 0;
            data.spo2Valid = false;
            Serial.println("⚠️ SpO2: pas de mesure valide");
        }
        
        // ── Batterie ────────────────────────────────────
        data.battery = readBatteryPercent();
        data.timestamp = millis() / 1000;
        
        lastSensorRead = millis();
    }

    // 2. Envoi BLE toutes les 2s si connecté
    if (BLEService_isConnected() && (millis() - lastSync >= SYNC_INTERVAL_MS)) {
        StaticJsonDocument<128> doc;

        // Chaque métrique : sa valeur réelle si valide, sinon null (jamais 0).
        // 0 n'est jamais physiologiquement valide pour temp/FC/SpO2 : l'envoyer
        // ferait rejeter la mesure par la validation backend (plages 30-45 / 20-300
        // / 50-100) et perdrait AUSSI les autres métriques valides du même snapshot.
        if (data.tempValid) doc["temp"] = data.temperature; else doc["temp"] = nullptr;
        if (data.hrValid)   doc["hr"]   = data.heartRate;   else doc["hr"]   = nullptr;
        if (data.spo2Valid) doc["spo2"] = data.spo2;        else doc["spo2"] = nullptr;
        doc["bat"] = data.battery;
        doc["ts"] = data.timestamp;

        // Flag : au moins une des trois métriques est exploitable.
        doc["valid"] = data.tempValid || data.hrValid || data.spo2Valid;
        
        String json;
        serializeJson(doc, json);

        // Délimiteur de trame : chaque message JSON se termine par '\n'.
        // Permet à l'app de ré-assembler proprement si une notification BLE
        // est fragmentée (MTU) et de séparer deux messages successifs.
        json += '\n';

        // Debug
        Serial.print("📤 JSON envoyé: ");
        Serial.print(json);

        // Envoyer via BLE
        BLEService_notifyData(json.c_str());
        
        lastSync = millis();
    }

    delay(10);
}