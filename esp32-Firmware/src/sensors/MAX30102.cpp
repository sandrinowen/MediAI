#include "MAX30102.h"
#include "../config.h"          // MAX30102_* + isValidHeartRate/isValidSpO2
#include <Wire.h>
#include <MAX30105.h>
#include <spo2_algorithm.h>

static MAX30105 particleSensor;

// Fenêtre glissante de 100 échantillons (~4 s à 25 Hz effectifs :
// MAX30102_SAMPLE_RATE 100 Hz ÷ MAX30102_SAMPLE_AVG 4). C'est exactement
// la fenêtre attendue par l'algorithme Maxim.
#define BUFFER_LENGTH        100
#define FINGER_IR_THRESHOLD  50000UL   // seuil de présence du doigt (IR)

static uint32_t irBuffer[BUFFER_LENGTH];
static uint32_t redBuffer[BUFFER_LENGTH];
static int      sampleCount = 0;       // échantillons valides actuellement dans la fenêtre

bool MAX30102_init() {
    if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
        Serial.println("❌ MAX30102 non détecté");
        return false;
    }

    particleSensor.setup(
        MAX30102_LED_BRIGHTNESS,   // luminosité LED
        MAX30102_SAMPLE_AVG,       // moyenne d'échantillons
        2,                         // mode LED : Red + IR (requis pour SpO2)
        MAX30102_SAMPLE_RATE,      // fréquence d'échantillonnage
        MAX30102_PULSE_WIDTH,      // largeur d'impulsion
        MAX30102_ADC_RANGE         // plage ADC
    );

    Serial.println("✅ MAX30102 initialisé");
    return true;
}

// Ajoute un échantillon à la fenêtre glissante. Une fois pleine, on décale
// d'un cran (on jette le plus ancien) : buffer roulant, pas de recalcul à vide.
static void pushSample(uint32_t red, uint32_t ir) {
    if (sampleCount < BUFFER_LENGTH) {
        redBuffer[sampleCount] = red;
        irBuffer[sampleCount]  = ir;
        sampleCount++;
    } else {
        memmove(redBuffer, redBuffer + 1, (BUFFER_LENGTH - 1) * sizeof(uint32_t));
        memmove(irBuffer,  irBuffer + 1,  (BUFFER_LENGTH - 1) * sizeof(uint32_t));
        redBuffer[BUFFER_LENGTH - 1] = red;
        irBuffer[BUFFER_LENGTH - 1]  = ir;
    }
}

// Non bloquant : draine ce que la FIFO a produit depuis le dernier appel,
// entretient la fenêtre glissante, et recalcule FC/SpO2 dès qu'elle est pleine.
// La cadence réelle est donc dictée par SENSOR_READ_INTERVAL_MS (loop()),
// plus par un delay() bloquant interne comme avant.
void MAX30102_read(int *heartRate, int *spo2) {
    *heartRate = 0;
    *spo2 = 0;

    // Récupère les nouveaux échantillons présents dans la FIFO (sans attendre).
    particleSensor.check();
    while (particleSensor.available()) {
        uint32_t ir  = particleSensor.getFIFOIR();
        uint32_t red = particleSensor.getFIFORed();
        particleSensor.nextSample();

        // Doigt retiré → la fenêtre n'a plus de sens : on la vide et on sort.
        if (ir < FINGER_IR_THRESHOLD) {
            sampleCount = 0;
            return;   // 0, 0 : pas de doigt
        }

        pushSample(red, ir);
    }

    // Fenêtre encore incomplète (montée en charge sur ~4 s) → pas exploitable.
    if (sampleCount < BUFFER_LENGTH) {
        return;   // 0, 0 : en cours de remplissage
    }

    int32_t spo2Value;      int8_t validSPO2;
    int32_t heartRateValue; int8_t validHeartRate;

    maxim_heart_rate_and_oxygen_saturation(
        irBuffer, BUFFER_LENGTH, redBuffer,
        &spo2Value, &validSPO2,
        &heartRateValue, &validHeartRate
    );

    // On n'expose une valeur que si l'algo la déclare valide ET plausible.
    if (validHeartRate && isValidHeartRate(heartRateValue)) {
        *heartRate = heartRateValue;
    }
    if (validSPO2 && isValidSpO2(spo2Value)) {
        *spo2 = spo2Value;
    }

    Serial.printf("  → MAX30102: HR=%d SpO2=%d\n", *heartRate, *spo2);
}
