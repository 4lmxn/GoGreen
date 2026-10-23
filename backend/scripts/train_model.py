import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor

# Synthetic training dataset representing vehicle physics and traffic dynamics:
# Features: [distance_km, cargo_weight_kg, traffic_factor (1.0=clear, 2.0=heavy), vehicle_type_code (0: EV, 1: CNG, 2: Diesel)]
# Target: co2_emissions_kg

np.random.seed(42)
n_samples = 2000

distance = np.random.uniform(5, 500, n_samples)
cargo = np.random.uniform(100, 5000, n_samples)
traffic = np.random.uniform(1.0, 2.2, n_samples)
vtype = np.random.choice([0, 1, 2], n_samples)  # 0: EV, 1: CNG, 2: Diesel

# Base emission factors (kg CO2 per km under baseline load)
base_factor = np.where(vtype == 0, 0.05, np.where(vtype == 1, 0.18, 0.27))

# Emission calculation with load and traffic penalties
co2 = distance * base_factor * (1.0 + (cargo / 5000.0) * 0.3) * (traffic ** 1.2) + np.random.normal(0, 0.5, n_samples)
co2 = np.maximum(co2, 0.1)

X = np.column_stack([distance, cargo, traffic, vtype])
y = co2

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X, y)

os.makedirs('app/ai_models', exist_ok=True)
model_path = os.path.join('app', 'ai_models', 'co2_predictor.joblib')
joblib.dump(model, model_path)
print(f"Model saved successfully to {model_path}")