import React, { useState, useEffect } from 'react';

export default function DriverEcoCoach() {
  const [braking, setBraking] = useState(2);
  const [accel, setAccel] = useState(3);
  const [idle, setIdle] = useState(12);
  const [speed, setSpeed] = useState(52);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchScore = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai/driver-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          harsh_braking: braking,
          rapid_accel: accel,
          idle_minutes: idle,
          avg_speed: speed,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Failed to calculate driver score:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-md text-slate-100 mb-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-emerald-400">🏅 AI Eco-Driving Coach</h2>
          <p className="text-xs text-slate-400">Live trip behavior telemetry & carbon anomaly detection</p>
        </div>
        {result && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
            result.tier_color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            result.tier_color === 'amber' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {result.tier}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Score Ring Display */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 rounded-xl border border-slate-700">
          <span className="text-4xl font-extrabold text-white">
            {result ? result.eco_score : '--'}
            <span className="text-lg font-normal text-slate-400">/100</span>
          </span>
          <span className="text-xs uppercase font-bold text-slate-400 mt-1">Trip Eco Score</span>
          {result && (
            <p className="text-[11px] text-rose-400 mt-2">
              Avoidable CO₂: +{result.wasted_co2_kg} kg
            </p>
          )}
        </div>

        {/* Live Simulation Controls */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
              <span>Harsh Braking Events</span>
              <span className="text-emerald-400">{braking}</span>
            </div>
            <input 
              type="range" min="0" max="10" value={braking}
              onChange={(e) => setBraking(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
              <span>Rapid Accelerations</span>
              <span className="text-emerald-400">{accel}</span>
            </div>
            <input 
              type="range" min="0" max="10" value={accel}
              onChange={(e) => setAccel(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
              <span>Excessive Idling</span>
              <span className="text-emerald-400">{idle} mins</span>
            </div>
            <input 
              type="range" min="0" max="35" value={idle}
              onChange={(e) => setIdle(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <button
            onClick={fetchScore}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-1.5 rounded text-xs font-bold transition-colors"
          >
            {loading ? 'Evaluating...' : 'Recalculate Behavior'}
          </button>
        </div>

        {/* AI Insight Box */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 h-full flex flex-col justify-center">
          <span className="text-xs uppercase font-bold text-slate-400 mb-2">💡 AI Coaching Insight</span>
          <p className="text-xs leading-relaxed text-slate-300 italic">
            "{result?.primary_coaching_tip || 'Loading recommendation...'}"
          </p>
        </div>
      </div>
    </div>
  );
}