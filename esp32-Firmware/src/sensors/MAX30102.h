#ifndef MAX30102_H
#define MAX30102_H

#include <Arduino.h>

bool MAX30102_init();
void MAX30102_read(int *heartRate, int *spo2);

#endif