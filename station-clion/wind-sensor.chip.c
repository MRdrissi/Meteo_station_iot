#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

// Structure pour garder en mémoire l'état de notre puce
typedef struct {
    pin_t pin_sig;
    uint32_t timer;
    float time_sec;
} chip_state_t;

// Cette fonction s'exécute automatiquement toutes les 100 millisecondes
void timer_callback(void *user_data) {

    chip_state_t *chip = (chip_state_t *)user_data;
    chip->time_sec += 0.1f;

    // 1. Vent de base (onde sinusoïdale douce 0.5V → 1.5V)
    float base_wind = 1.0f + sinf(chip->time_sec * 0.5f) * 0.5f;

    // 2. Turbulences (petites variations rapides, entre 0 et 0.3V)
    float noise = ((float)rand() / (float)RAND_MAX) * 0.3f;

    // 3. Rafales (10% de chance d'un pic de tension jusqu'à 1.5V)
    float gust = 0.0f;
    if (rand() % 100 < 10) {
        gust = ((float)rand() / (float)RAND_MAX) * 1.5f;
    }

    // Tension finale, bornée à [0V ; 3.3V]
    float total_voltage = base_wind + noise + gust;
    if (total_voltage < 0.0f) total_voltage = 0.0f;
    if (total_voltage > 3.3f) total_voltage = 3.3f;

    // Envoi de la tension analogique vers l'ESP32
    pin_dac_write(chip->pin_sig, total_voltage);
}

// Fonction de démarrage de la puce
void chip_init(void) {
    chip_state_t *chip = malloc(sizeof(chip_state_t));
    chip->pin_sig = pin_init("SIG", ANALOG);
    chip->time_sec = 0.0;

    // On lance l'horloge interne (100000 microsecondes = 100ms)
    const timer_config_t timer_config = {
        .callback = timer_callback,
        .user_data = chip,
      };
    chip->timer = timer_init(&timer_config);
    timer_start(chip->timer, 100000, true);

    printf("Custom Chip Anemometre Initialise !\n");
}