#ifndef BLE_SERVICE_H
#define BLE_SERVICE_H

#include <Arduino.h>

// Déclarations des fonctions BLE
void setupBLE();
void BLEService_notifyData(const char* jsonData);
bool BLEService_isConnected();

#endif