from flask import Blueprint, request, jsonify
from app.ml.artifacts import load_model
import os
import numpy as np

ai_bp = Blueprint('ai_engine', __name__, url_prefix='/api/ai')

# Path to the trained model in app/ai_models
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'ai_models', 'co2_predictor.joblib')
model = load_model(MODEL_PATH)

from app.utils.rbac import role_required


@ai_bp.route('/fleet-health')
@role_required('admin')
def fleet_health():
    from app.ml.predict import _load_models, _models
    _load_models()
    return jsonify(models=[{'model_name': name, 'available': True} for name in _models],
                   predictive_maintenance={'available': False, 'reason': 'No measured maintenance model connected'},
                   system_status='Model ready' if _models else 'Formula fallback',
                   training_data='Synthetic; real-world accuracy not validated')

@ai_bp.route('/predict-route', methods=['POST'])
@role_required('admin')
def predict_route():
    data = request.get_json() or {}
    
    from app.services.trip_workflow import number
    try:
        distance = number(data.get('distance_km', 120), 'Distance', 0.1, 500)
        cargo = number(data.get('cargo_weight_kg', 1500), 'Cargo', 0, 5000)
    except ValueError as exc:
        return jsonify(message=str(exc)), 422
    vtype_str = str(data.get('vehicle_type', 'diesel')).lower()
    
    # 0: EV, 1: CNG, 2: Diesel
    type_map = {'ev': 0, 'cng': 1, 'diesel': 2}
    vtype_code = type_map.get(vtype_str, 2)
    
    # 1. Standard Route
    standard_features = np.array([[distance, cargo, 1.6, vtype_code]])
    standard_co2 = float(model.predict(standard_features)[0]) if model else distance * 0.28
    
    # 2. EcoRoute (optimized traffic flow)
    eco_distance = round(distance * 1.04, 1)
    eco_features = np.array([[eco_distance, cargo, 1.1, vtype_code]])
    eco_co2 = float(model.predict(eco_features)[0]) if model else eco_distance * 0.21
    
    saved_co2 = max(0.0, standard_co2 - eco_co2)
    pct_saved = (saved_co2 / standard_co2) * 100 if standard_co2 > 0 else 0.0

    return jsonify({
        "success": True,
        "prediction_mode": 'Synthetic-trained scenario model' if model else 'Formula scenario fallback',
        "standard_route": {
            "distance_km": distance,
            "estimated_duration_min": int(distance * 1.3),
            "predicted_co2_kg": round(standard_co2, 2)
        },
        "eco_route": {
            "distance_km": eco_distance,
            "estimated_duration_min": int(eco_distance * 1.15),
            "predicted_co2_kg": round(eco_co2, 2)
        },
        "co2_saved_kg": round(saved_co2, 2),
        "savings_percentage": round(pct_saved, 1)
    }), 200
@ai_bp.route('/driver-score', methods=['POST'])
def calculate_driver_score():
    data = request.get_json() or {}
    
    # Telemetry inputs from driver trip
    harsh_braking_count = int(data.get('harsh_braking', 2))
    rapid_accel_count = int(data.get('rapid_accel', 3))
    idle_minutes = float(data.get('idle_minutes', 12))
    avg_speed_kmh = float(data.get('avg_speed', 54))

    # AI Penalties & Anomaly Calculations
    brake_penalty = harsh_braking_count * 4.5
    accel_penalty = rapid_accel_count * 3.5
    idle_penalty = max(0.0, (idle_minutes - 5.0) * 1.5)
    speed_penalty = 10.0 if avg_speed_kmh > 75 else 0.0

    raw_score = 100.0 - (brake_penalty + accel_penalty + idle_penalty + speed_penalty)
    score = int(np.clip(raw_score, 20, 100))

    # Compute wasted fuel and avoidable CO2 emissions
    wasted_co2_kg = round((harsh_braking_count * 0.18) + (rapid_accel_count * 0.22) + (idle_minutes * 0.08), 2)

    # Determine rank & contextual recommendations
    if score >= 85:
        tier = "Eco Champion"
        tier_color = "emerald"
        tip = "Smooth acceleration and minimal idling. Excellent fuel conservation!"
    elif score >= 65:
        tier = "Efficient Driver"
        tier_color = "amber"
        tip = "Watch prolonged stop-and-go idling. Cutting idle time by 5 mins saves ~0.4 kg CO₂."
    else:
        tier = "Needs Optimization"
        tier_color = "rose"
        tip = "High frequency of harsh braking and sudden accelerations detected. Ease throttle pressure."

    return jsonify({
        "success": True,
        "eco_score": score,
        "tier": tier,
        "tier_color": tier_color,
        "wasted_co2_kg": wasted_co2_kg,
        "primary_coaching_tip": tip,
        "telemetry_breakdown": {
            "harsh_braking_events": harsh_braking_count,
            "rapid_accel_events": rapid_accel_count,
            "idle_duration_min": idle_minutes,
            "average_speed_kmh": avg_speed_kmh
        }
    }), 200
