-- Insérer les stations connues
INSERT INTO stations (station_id, city, latitude, longitude, status, created_at)
VALUES
    ('ST-CASABLANCA', 'Casablanca', 33.57, -7.58, 'ACTIVE', NOW()),
    ('ST-RABAT',      'Rabat',      34.02, -6.84, 'ACTIVE', NOW()),
    ('ST-MARRAKECH',  'Marrakech',  31.63, -8.01, 'ACTIVE', NOW()),
    ('ST-TANGER',     'Tanger',     35.77, -5.81, 'ACTIVE', NOW()),
    ('ST-FES',        'Fès',        34.03, -5.00, 'ACTIVE', NOW())
ON CONFLICT (station_id) DO NOTHING;