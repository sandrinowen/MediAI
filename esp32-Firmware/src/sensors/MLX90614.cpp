#include "MLX90614.h"
#include "../config.h"   // MLX90614_TEMP_OFFSET, seuils de validité

static Adafruit_MLX90614 mlx;

bool MLX90614_init() {
    if (!mlx.begin()) {
        Serial.println("❌ MLX90614 non détecté");
        return false;
    }
    Serial.println("✅ MLX90614 initialisé");
    return true;
}

float MLX90614_readTemperature() {
    float tempObj = mlx.readObjectTempC();

    // Validation de la lecture matérielle brute (avant compensation).
    // Retourne NAN — et jamais 0 — pour signaler « pas de mesure » :
    // l'appelant teste la plage [30,45], que NAN et 0 échouent tous deux,
    // mais NAN est sémantiquement correct (0 est une fausse valeur).
    if (isnan(tempObj) || tempObj < 25.0 || tempObj > 45.0) {
        return NAN;
    }

    // Compensation peau → cœur appliquée sur TOUTE la plage (une fièvre
    // >40 °C doit l'être aussi — l'ancienne borne [30,40) la laissait passer).
    // Offset centralisé dans config.h (estimation indicative, à calibrer).
    float tempCorrigee = tempObj + MLX90614_TEMP_OFFSET;

    Serial.printf("  → MLX90614: %.1f°C (brut %.1f + %.1f)\n",
                  tempCorrigee, tempObj, (float) MLX90614_TEMP_OFFSET);
    return tempCorrigee;
}