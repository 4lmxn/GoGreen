import React, { useState } from 'react';
import api from '../../api/api';
import { errorMessage } from '../../components/Operations';

export default function AICommandCenter() {
  const [distance, setDistance] = useState(150);
  const [cargo, setCargo] = useState(2000);
  const [vehicleType, setVehicleType] = useState('diesel');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateEmissions = async () => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const { data } = await api.post('/ai/predict-route', { distance_km: distance, cargo_weight_kg: cargo, vehicle_type: vehicleType });
      setPrediction(data);
    } catch (err) {
      console.error('Failed to run AI prediction:', err);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-400">Route emissions sandbox</h1>
        <p className="text-slate-400 text-sm mt-1">
          Explore assumed scenarios. These are not road-route recommendations or measured savings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Parameter Form */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-5 text-slate-200 border-b border-slate-700 pb-2">
              Trip Parameters
            </h2>

            {/* Distance Slider */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs uppercase font-bold text-slate-400">Route Distance</label>
                <span className="text-sm font-semibold text-emerald-400">{distance} km</span>
              </div>
              <input
                type="range"
                min="20"
                max="800"
                step="5"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>20 km</span>
                <span>800 km</span>
              </div>
            </div>

            {/* Cargo Weight Slider */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs uppercase font-bold text-slate-400">Cargo Payload</label>
                <span className="text-sm font-semibold text-emerald-400">{cargo.toLocaleString()} kg</span>
              </div>
              <input
                type="range"
                min="100"
                max="6000"
                step="100"
                value={cargo}
                onChange={(e) => setCargo(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>100 kg</span>
                <span>6,000 kg</span>
              </div>
            </div>

            {/* Propulsion Dropdown */}
            <div className="mb-6">
              <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Vehicle Propulsion Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="diesel">Heavy Diesel Truck</option>
                <option value="cng">CNG Van / Light Truck</option>
                <option value="ev">Electric Vehicle (EV Fleet)</option>
              </select>
            </div>
          </div>

          <div>
            {error && (
              <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-200 text-xs">
                {error}
              </div>
            )}
            <button
              onClick={calculateEmissions}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer shadow-md"
            >
              {loading ? 'Evaluating Model...' : 'Compare assumed scenarios'}
            </button>
          </div>
        </div>

        {/* Right Column: Prediction Comparison Card */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-center">
          {!prediction ? (
            <div className="text-center text-slate-500 py-16">
              <p className="text-base font-medium">Ready for Simulation</p>
              <p className="text-xs text-slate-500 mt-1">
                Adjust distance, cargo weight, and fuel type on the left, then click <strong>Compare assumed scenarios</strong>.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-5 border-b border-slate-700 pb-3">
                <span className="text-xs uppercase font-bold text-slate-400">Model Analysis</span>
                <span className="bg-emerald-500/20 text-emerald-400 font-bold text-xs px-3 py-1 rounded-full border border-emerald-500/30">
                  -{prediction.savings_percentage}% modeled difference
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Standard Route */}
                <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-400 block mb-1">Assumed standard scenario</span>
                  <p className="text-2xl font-bold text-red-400">{prediction.standard_route.predicted_co2_kg} <span className="text-sm font-normal text-slate-400">kg CO₂</span></p>
                  <p className="text-xs text-slate-400 mt-2">
                    {prediction.standard_route.distance_km} km • ~{prediction.standard_route.estimated_duration_min} mins
                  </p>
                </div>

                {/* EcoRoute */}
                <div className="bg-emerald-950/40 p-4 rounded-lg border border-emerald-500/40">
                  <span className="text-xs text-emerald-400 block mb-1">Assumed lower-traffic scenario</span>
                  <p className="text-2xl font-bold text-emerald-400">{prediction.eco_route.predicted_co2_kg} <span className="text-sm font-normal text-emerald-400/70">kg CO₂</span></p>
                  <p className="text-xs text-emerald-300/80 mt-2">
                    {prediction.eco_route.distance_km} km • ~{prediction.eco_route.estimated_duration_min} mins
                  </p>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600">
                <p className="text-sm font-semibold text-emerald-300">
                  Modeled difference: <span className="text-white font-bold">{prediction.co2_saved_kg} kg CO₂</span>.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {prediction.prediction_mode} · Assumes a 4% longer alternative and lower traffic factor; elevation is not modeled.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}