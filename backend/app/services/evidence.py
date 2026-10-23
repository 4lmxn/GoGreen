"""Evidence available at planning time; never a calibrated confidence score."""
from functools import lru_cache
from hashlib import sha256
from pathlib import Path


@lru_cache(maxsize=4)
def artifact_fingerprint(name):
    path = Path(__file__).parents[1] / 'ml' / 'models' / name
    return sha256(path.read_bytes()).hexdigest() if path.exists() else None


def evidence_for(route, vehicle, load, mode):
    kind = (vehicle.type or '').strip().lower()
    fuel = (vehicle.fuel_type or '').strip().lower()
    reasons = []
    if not 5 <= route['distance_km'] <= 500:
        reasons.append('Distance is outside the synthetic training range of 5–500 km.')
    if not 0 <= load <= 5000:
        reasons.append('Cargo is outside the synthetic training range of 0–5000 kg.')
    if kind not in ('van', 'truck'):
        reasons.append('Vehicle class has no validated energy profile in this model.')
    if fuel != 'diesel':
        reasons.append('The synthetic emissions target uses a diesel factor; this fuel needs a dedicated model.')
    return {
        'schema': 'planning-evidence-v1', 'within_documented_domain': not reasons,
        'limitations': reasons,
        'inputs': {'distance_km': route['distance_km'], 'cargo_kg': load,
                   'vehicle_type': vehicle.type, 'fuel_type': vehicle.fuel_type,
                   'traffic': 'Medium (assumed)', 'weather': 'Clear (assumed)'},
        'routing_provider': 'OSRM driving', 'truck_restrictions_verified': False,
        'training_source': 'Synthetic generator', 'prediction_mode': mode,
        'confidence': 'Uncalibrated',
        'artifact_sha256': artifact_fingerprint('co2_model.joblib') if 'Random Forest' in mode else None,
    }
