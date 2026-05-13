#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

typedef struct {
    pin_t pin_sig;
    uint32_t timer;
    float time_sec;
} chip_state_t;

void timer_callback(void *user_data) {
    chip_state_t *chip = (chip_state_t *)user_data;
    chip->time_sec += 0.1f;

    // 1. Pression de base (Onde très lente simulant la météo qui change)
    // Oscille doucement autour de 1010 hPa, avec une amplitude de +/- 20 hPa
    float current_hpa = 1010.0f + sin(chip->time_sec * 0.1f) * 20.0f;

    // 2. Micro-bruit du capteur (Très faible pour un baromètre, +/- 0.5 hPa)
    float noise = ((float)rand() / (float)RAND_MAX) * 1.0f - 0.5f;
    current_hpa += noise;

    // 3. Sécurité : Rester dans les limites de l'ESP32 (980 - 1040)
    if (current_hpa < 980.0f) current_hpa = 980.0f;
    if (current_hpa > 1040.0f) current_hpa = 1040.0f;

    // 4. Conversion Inverse : Pression (hPa) -> Voltage (0 à 3.3V)
    // (current_hpa - 980) / 60 donne un pourcentage entre 0 et 1
    float total_voltage = ((current_hpa - 980.0f) / 60.0f) * 3.3f;

    // On envoie le signal analogique !
    pin_dac_write(chip->pin_sig, total_voltage);
}

void chip_init(void) {
    chip_state_t *chip = malloc(sizeof(chip_state_t));
    chip->pin_sig = pin_init("SIG", ANALOG);
    chip->time_sec = 0.0f;

    const timer_config_t timer_config = {
        .callback = timer_callback,
        .user_data = chip,
      };
    chip->timer = timer_init(&timer_config);
    timer_start(chip->timer, 100000, true);

    printf("Custom Chip Barometre Initialise !\n");
}