#ifndef MLX90614_H
#define MLX90614_H

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>

// Déclarations des fonctions
bool MLX90614_init();
float MLX90614_readTemperature();

#endif