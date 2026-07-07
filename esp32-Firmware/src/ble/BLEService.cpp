#include "BLEService.h"
#include "../config.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ── Variables globales BLE ──────────────────────────────────
static BLEServer *pServer = nullptr;
static BLECharacteristic *pDataChar = nullptr;
static bool deviceConnected = false;
static bool oldDeviceConnected = false;

// ── Callbacks BLE (gestion connexion/déconnexion) ───────────
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        Serial.println("📱 Téléphone connecté !");
    }

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        Serial.println("📱 Téléphone déconnecté.");
        
        // Redémarrer l'advertising pour permettre une nouvelle connexion
        BLEDevice::startAdvertising();
        Serial.println("📡 BLE Advertising redémarré");
    }
};

// ── Initialisation BLE ──────────────────────────────────────
void setupBLE() {
    Serial.println("🔧 Initialisation BLE...");
    
    // 1. Initialiser le périphérique BLE
    BLEDevice::init(DEVICE_NAME);

    // Autoriser un MTU plus grand (défaut = 23 → payload 20 octets, trop petit
    // pour le JSON ~60 octets). Avec 247, un message tient dans une notification.
    BLEDevice::setMTU(247);
    
    // 2. Créer le serveur BLE
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());
    
    // 3. Créer le service BLE
    BLEService *pService = pServer->createService(SERVICE_UUID);
    
    // 4. Créer la caractéristique de données (NOTIFY + READ)
    pDataChar = pService->createCharacteristic(
        CHAR_DATA_UUID,
        BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
    );
    
    // 5. Ajouter le descripteur CCCD (obligatoire pour les notifications)
    pDataChar->addDescriptor(new BLE2902());
    
    // 6. Démarrer le service
    pService->start();
    
    // 7. Configurer l'advertising
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // Optimisation connexion iPhone
    pAdvertising->setMinPreferred(0x12);
    
    // 8. Démarrer l'advertising
    BLEDevice::startAdvertising();
    
    Serial.println("✅ BLE initialisé");
    Serial.println("📡 BLE Advertising démarré - En attente de connexion...");
}

// ── Envoyer des données via BLE (NOTIFY) ────────────────────
void BLEService_notifyData(const char* jsonData) {
    if (!deviceConnected) {
        Serial.println("⚠️ Pas de connexion BLE - données non envoyées");
        return;
    }
    
    // Définir la valeur de la caractéristique
    pDataChar->setValue(jsonData);
    
    // Envoyer la notification au téléphone
    pDataChar->notify();
    
    Serial.print("📤 NOTIFY: ");
    Serial.println(jsonData);
}

// ── Vérifier si un téléphone est connecté ───────────────────
bool BLEService_isConnected() {
    return deviceConnected;
}
