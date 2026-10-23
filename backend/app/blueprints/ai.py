from flask import Blueprint, request, jsonify
import joblib
import os
import numpy as np

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'ai_models', 'co2_predictor.joblib')
model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None

@ai_bp.route('/predict-route', methods=['POST'])
def predict_route():
    data = request.get_json() or {}
    
    distance = float(data.get('distance_km', 120))
    cargo = float(data.get('cargo_weight_kg', 1500))
    vtype_str = data.get('vehicle_type', 'diesel').lower()
    
    # 0: EV, 1: CNG, 2: Diesel
    type_map = {'ev': 0, 'cng': 1, 'diesel': 2}
    vtype_code = type_map.get(vtype_str, 2)
    
    # 1. Standard Route (highway/direct, standard heavy traffic factor 1.6)
    standard_features = np.array([[distance, cargo, 1.6, vtype_code]])
    standard_co2 = float(model.predict(standard_features)[0]) if model else distance * 0.28
    
    # 2. EcoRoute (slightly longer distance +4%, but optimal flow / traffic factor 1.1)
    eco_distance = round(distance * 1.04, 1)
    eco_features = np.array([[eco_distance, cargo, 1.1, vtype_code]])
    eco_co2 = float(model.predict(eco_features)[0]) if model else eco_distance * 0.21
    
    saved_co2 = max(0.0, standard_co2 - eco_co2)
    pct_saved = (saved_co2 / standard_co2) * 100 if standard_co2 > 0 else 0.0

    return jsonify({
        "success": True,
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