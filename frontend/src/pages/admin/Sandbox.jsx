import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import { Pause, Play, RotateCcw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import api from '../../api/api';
import { PageHeader, ErrorNotice, amount, errorMessage } from '../../components/Operations';
import './sandbox.css';

// Leaflet draws SVG attributes, which cannot read CSS variables, so the status
// colours repeat the design tokens from src/index.css here.
const STATUS_COLOURS = {
  driving: '#1b6a45',
  returning: '#6fa58a',
  delivering: '#c08a2e',
  idle: '#8a9690',
  done: '#b9c4bd',
};
const STATUS_LABELS = {
  driving: 'Driving to a stop',
  delivering: 'Unloading',
  returning: 'Returning to depot',
  idle: 'At depot',
  done: 'Finished for the day',
};
const DEPOT_COLOUR = '#e0a32e';
const SPEEDS = [1, 5, 15, 30];
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

/** Minutes since midnight → "HH:MM". */
function clock(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const hours = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mins = String(total % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

export default function Sandbox() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  // Poll the build status; fast while building, slow otherwise.
  useEffect(() => {
    let live = true;
    let timer;
    async function load() {
      try {
        const { data } = await api.get('/sim/status');
        if (live) {
          setStatus(data);
          setError('');
        }
      } catch (err) {
        if (live) setError(errorMessage(err));
      } finally {
        if (live) timer = setTimeout(load, status?.phase === 'building' ? 1000 : 4000);
      }
    }
    load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [status?.phase]);

  async function reset() {
    try {
      const { data } = await api.post('/sim/reset');
      setStatus(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const ready = status?.phase === 'ready';

  return (
    <div className="op-page sb-page">
      <PageHeader
        eyebrow="GoGreen / Sandbox"
        title="Fleet simulation"
        description="A synthetic day of deliveries in Bengaluru, planned and driven on real roads. Use it to see the system at fleet scale and how per-vehicle calibration learns."
        action={ready && (
          <button type="button" className="op-button secondary" onClick={reset}>
            <RotateCcw size={15} /> New scenario
          </button>
        )}
      />
      <SimulationTag />
      <ErrorNotice>{error}</ErrorNotice>
      {ready ? (
        <Running status={status} />
      ) : (
        <StartPanel status={status} onStarted={setStatus} onError={setError} />
      )}
    </div>
  );
}

function SimulationTag() {
  return (
    <div className="sb-tag" role="note">
      <strong>Simulation</strong>
      <span>
        Orders, traffic and each truck&apos;s true fuel use are synthetic. Roads, distances and terrain are real.
        These results show operations and learning, not model accuracy on real trucks.
      </span>
    </div>
  );
}

// ── Start screen ───────────────────────────────────────────────────────────────

function StartPanel({ status, onStarted, onError }) {
  const [form, setForm] = useState({ trucks: 150, orders: 900, seed: 7 });
  const building = status?.phase === 'building';
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function start(event) {
    event.preventDefault();
    onError('');
    try {
      const { data } = await api.post('/sim/start', {
        trucks: Number(form.trucks),
        orders: Number(form.orders),
        seed: Number(form.seed),
      });
      onStarted(data);
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <section className="op-panel sb-start">
      <form onSubmit={start} className="sb-start-form">
        <h2>Set up the day</h2>
        <label htmlFor="sim-trucks">
          Trucks <span>10–200</span>
          <input id="sim-trucks" className="op-input" type="number" min="10" max="200" value={form.trucks} onChange={set('trucks')} disabled={building} />
        </label>
        <label htmlFor="sim-orders">
          Orders <span>50–1,200</span>
          <input id="sim-orders" className="op-input" type="number" min="50" max="1200" value={form.orders} onChange={set('orders')} disabled={building} />
        </label>
        <label htmlFor="sim-seed">
          Seed <span>same seed, same day</span>
          <input id="sim-seed" className="op-input" type="number" min="0" value={form.seed} onChange={set('seed')} disabled={building} />
        </label>
        <button type="submit" className="op-button" disabled={building}>
          {building ? 'Building the day…' : 'Build and run the day'}
        </button>
      </form>

      <div className="sb-start-side">
        {building ? (
          <BuildProgress status={status} />
        ) : (
          <>
            <h3>What happens</h3>
            <ol className="sb-steps">
              <li>Orders are spread over 40 Bengaluru localities and split between the Peenya, Hoskote and Electronic City depots.</li>
              <li>Real road distances come from OSRM, about one request per 80 orders.</li>
              <li>Orders are packed into rounds of up to 8 stops and each round is ordered exactly by the planner.</li>
              <li>Trucks drive the rounds in assumed time-of-day traffic, report fuel, and the calibration loop learns each truck.</li>
            </ol>
            {status?.phase === 'failed' && <p className="sb-failed">{status.message} {status.error}</p>}
          </>
        )}
      </div>
    </section>
  );
}

function BuildProgress({ status }) {
  const percent = Math.round((status.progress || 0) * 100);
  return (
    <div className="sb-progress" aria-live="polite">
      <h3>Building the day</h3>
      <div className="sb-progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
        <div className="sb-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="sb-mono">{percent}% · {status.message}</p>
      <p className="op-note">OSRM requests so far: <span className="sb-mono">{status.osrm_requests}</span>. The public server allows about one per second.</p>
    </div>
  );
}

// ── Running day ────────────────────────────────────────────────────────────────

function Running({ status }) {
  const { start_min: dayStart, end_min: dayEnd } = status.day;
  const [time, setTime] = useState(dayStart);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [state, setState] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [truck, setTruck] = useState(null);
  const [error, setError] = useState('');

  // Clock: `speed` simulated minutes per real second.
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setTime((current) => {
        const next = Math.min(dayEnd, current + speed);
        if (next >= dayEnd) setPlaying(false);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, speed, dayEnd]);

  // Fetch positions for the current time; a newer time cancels the older request.
  useEffect(() => {
    const controller = new AbortController();
    api.get('/sim/state', { params: { t: time }, signal: controller.signal })
      .then(({ data }) => {
        setState(data);
        setError('');
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [time]);

  useEffect(() => {
    if (!selectedId) {
      setTruck(null);
      return;
    }
    api.get(`/sim/trucks/${selectedId}`)
      .then(({ data }) => setTruck(data))
      .catch((err) => setError(errorMessage(err)));
  }, [selectedId]);

  useEffect(() => {
    api.get('/sim/summary')
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      <ErrorNotice>{error}</ErrorNotice>
      <ClockBar
        time={time}
        dayStart={dayStart}
        dayEnd={dayEnd}
        playing={playing}
        speed={speed}
        traffic={state?.traffic_multiplier}
        roadShapes={status.road_shapes}
        onPlay={() => setPlaying(!playing)}
        onSpeed={setSpeed}
        onSeek={(value) => {
          setPlaying(false);
          setTime(value);
        }}
      />
      {state && <KpiStrip kpis={state.kpis} />}
      <div className="sb-main">
        <FleetMap state={state} selectedId={selectedId} route={truck?.rounds.map((r) => r.path)} onSelect={setSelectedId} />
        <TruckPanel truck={truck} time={time} />
      </div>
      {summary && <DaySummary summary={summary} />}
    </>
  );
}

function ClockBar({ time, dayStart, dayEnd, playing, speed, traffic, roadShapes, onPlay, onSpeed, onSeek }) {
  return (
    <section className="sb-clock">
      <button type="button" className="op-button" onClick={onPlay} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="sb-clock-time">
        <span className="sb-mono sb-big">{clock(time)}</span>
        <span className="op-note">
          Traffic ×<span className="sb-mono">{traffic ? traffic.toFixed(1) : '—'}</span> (assumed)
        </span>
      </div>
      <input
        className="sb-slider"
        type="range"
        min={dayStart}
        max={dayEnd}
        step="1"
        value={time}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Simulated time of day"
      />
      <div className="sb-speeds" role="group" aria-label="Simulation speed">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className={value === speed ? 'active' : ''}
            onClick={() => onSpeed(value)}
          >
            <span className="sb-mono">{value}</span> min/s
          </button>
        ))}
      </div>
      <span className="op-note sb-shapes">
        Road shapes <span className="sb-mono">{roadShapes.loaded}/{roadShapes.total}</span>
      </span>
    </section>
  );
}

function KpiStrip({ kpis }) {
  const saved = kpis.co2_saved_vs_fastest_kg;
  const items = [
    { label: 'Delivered', value: `${kpis.delivered} / ${kpis.orders_total}`, lead: true },
    { label: 'Trucks on the road', value: kpis.on_road },
    { label: 'Distance driven', value: amount(kpis.distance_km), unit: 'km' },
    { label: 'CO₂ so far (simulated)', value: amount(kpis.co2_kg), unit: 'kg' },
    { label: 'CO₂ saved vs fastest order', value: `${saved >= 0 ? '' : '−'}${amount(Math.abs(saved))}`, unit: 'kg' },
  ];
  return (
    <section className="sb-kpis">
      {items.map((item) => (
        <div key={item.label} className={item.lead ? 'sb-kpi lead' : 'sb-kpi'}>
          <span>{item.label}</span>
          <strong className="sb-mono">
            {item.value}
            {item.unit && <small> {item.unit}</small>}
          </strong>
        </div>
      ))}
    </section>
  );
}

function FleetMap({ state, selectedId, route, onSelect }) {
  return (
    <section className="sb-map">
      <MapContainer center={[12.97, 77.62]} zoom={11} scrollWheelZoom className="sb-map-canvas">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {route?.map((path, index) => (
          <Polyline key={index} positions={path} pathOptions={{ color: '#1b6a45', weight: 4, opacity: 0.8 }} />
        ))}
        {state?.depots.map((depot) => (
          <CircleMarker
            key={depot.name}
            center={[depot.lat, depot.lng]}
            radius={9}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: DEPOT_COLOUR, fillOpacity: 1 }}
          >
            <Tooltip>{depot.name} depot</Tooltip>
          </CircleMarker>
        ))}
        {state?.trucks.map((truck) => (
          <CircleMarker
            key={truck.id}
            center={[truck.lat, truck.lng]}
            radius={truck.id === selectedId ? 8 : 4.5}
            pathOptions={{
              color: truck.id === selectedId ? '#0f3527' : '#ffffff',
              weight: truck.id === selectedId ? 3 : 1,
              fillColor: STATUS_COLOURS[truck.status],
              fillOpacity: 0.95,
            }}
            eventHandlers={{ click: () => onSelect(truck.id) }}
          >
            <Tooltip>
              {truck.plate} · {STATUS_LABELS[truck.status]} · {truck.load_kg} kg
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <ul className="sb-legend">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <li key={key}><i style={{ background: STATUS_COLOURS[key] }} />{label}</li>
        ))}
        <li><i style={{ background: DEPOT_COLOUR }} />Depot</li>
      </ul>
    </section>
  );
}

function TruckPanel({ truck, time }) {
  if (!truck) {
    return (
      <aside className="op-panel sb-truck sb-truck-empty">
        <h2>Pick a truck</h2>
        <p className="op-note">Click any dot on the map to see its rounds, the load falling after each drop, and how calibration learns it.</p>
      </aside>
    );
  }

  return (
    <aside className="op-panel sb-truck">
      <header>
        <span className="sb-mono sb-plate">{truck.plate}</span>
        <p className="op-note">
          {truck.class_label} · {truck.fuel} · capacity <span className="sb-mono">{amount(truck.capacity_kg)}</span> kg · {truck.depot}
        </p>
      </header>

      <div className="sb-factors">
        <Factor label="True factor (hidden)" value={truck.hidden_factor} />
        <Factor label="Learned after today" value={truck.learned_factor_day1} />
        <Factor label="Learned after 30 days" value={truck.learned_factor_30d} />
      </div>

      {truck.rounds.map((round, index) => (
        <RoundCard key={round.round_id} round={round} index={index} time={time} />
      ))}
    </aside>
  );
}

function Factor({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong className="sb-mono">×{value.toFixed(3)}</strong>
    </div>
  );
}

function RoundCard({ round, index, time }) {
  const unit = round.fuel_unit;
  return (
    <section className="sb-round">
      <h3>
        Round {index + 1}
        <span className="sb-mono"> {clock(round.depart_min)}–{clock(round.return_min)}</span>
        {time >= round.depart_min && time < round.return_min && <em>On the road</em>}
      </h3>
      <table className="sb-table">
        <thead>
          <tr><th>Stop</th><th>Drop</th><th>Load before</th><th>Traffic</th></tr>
        </thead>
        <tbody>
          {round.stops.map((stop, i) => (
            <tr key={i}>
              <td>{i + 1}. {stop.label}</td>
              <td className="sb-mono">{stop.drop_kg} kg</td>
              <td className="sb-mono">{amount(round.legs[i].load_kg)} kg</td>
              <td className="sb-mono">×{round.legs[i].traffic.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sb-fuel">
        Predicted <span className="sb-mono">{amount(round.predicted_fuel)} {unit}</span>
        {' · '}reported <span className="sb-mono">{amount(round.reported_fuel)} {unit}</span>
        {round.bad_report && <em className="sb-rejected"> rejected by the sanity gate</em>}
      </p>
    </section>
  );
}

// ── Whole-day summary ──────────────────────────────────────────────────────────

function DaySummary({ summary }) {
  const planning = summary.planning;
  return (
    <div className="sb-summary">
      <section className="op-panel">
        <h2>Planning effect across the fleet</h2>
        <p className="op-note">
          Same rounds, three ways to order the stops. Totals use the planner&apos;s free-flow estimates.
        </p>
        <table className="sb-table">
          <tbody>
            <tr><td>Fastest order</td><td className="sb-mono">{amount(planning.fastest_co2_kg)} kg</td><td /></tr>
            <tr><td>Balanced (used)</td><td className="sb-mono">{amount(planning.balanced_co2_kg)} kg</td><td className="sb-mono">−{planning.balanced_saving_percent}%</td></tr>
            <tr><td>Greenest order</td><td className="sb-mono">{amount(planning.greenest_co2_kg)} kg</td><td className="sb-mono">−{planning.greenest_saving_percent}%</td></tr>
          </tbody>
        </table>
        <p className="op-note">
          In simulated traffic the day emitted <span className="sb-mono">{amount(summary.traffic_effect.simulated_actual_co2_kg)} kg</span>
          {' '}against <span className="sb-mono">{amount(summary.traffic_effect.planned_free_flow_co2_kg)} kg</span> planned on free-flow roads.
          {' '}<span className="sb-mono">{summary.rounds}</span> rounds, <span className="sb-mono">{summary.trucks_used}</span> trucks,
          {' '}<span className="sb-mono">{summary.unassigned_orders}</span> orders left unassigned.
        </p>
      </section>

      <section className="op-panel">
        <h2>Calibration learning</h2>
        <p className="op-note">
          Average gap between each truck&apos;s learned and hidden factor as trips accumulate
          ({summary.calibration.replay_days} replayed days). <span className="sb-mono">{summary.calibration.rejected_reports}</span> bad reports were rejected.
        </p>
        <ConvergenceChart calibration={summary.calibration} />
      </section>

      <section className="op-panel">
        <h2>Assumed traffic</h2>
        <table className="sb-table">
          <thead><tr><th>Hours</th><th>Period</th><th>Travel time</th></tr></thead>
          <tbody>
            {summary.traffic.map((row) => (
              <tr key={row.from}>
                <td className="sb-mono">{String(row.from).padStart(2, '0')}–{String(row.to).padStart(2, '0')}</td>
                <td>{row.label}</td>
                <td className="sb-mono">×{row.multiplier.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="op-note">An assumption, not a measurement; each leg also gets ±10% noise.</p>
      </section>

      <section className="op-panel sb-assumptions">
        <h2>What is real and what is synthetic</h2>
        <ul>
          {summary.assumptions.map((text) => <li key={text}>{text}</li>)}
        </ul>
      </section>
    </div>
  );
}

function ConvergenceChart({ calibration }) {
  const series = calibration.series;
  const width = 520;
  const height = 200;
  const pad = { left: 46, right: 16, top: 14, bottom: 34 };
  const maxX = series[series.length - 1].trips_per_truck || 1;
  const maxY = Math.max(calibration.no_learning_error, ...series.map((p) => p.mean_abs_error)) * 1.1;
  const x = (value) => pad.left + (value / maxX) * (width - pad.left - pad.right);
  const y = (value) => height - pad.bottom - (value / maxY) * (height - pad.top - pad.bottom);
  const line = series.map((p, i) => `${i ? 'L' : 'M'}${x(p.trips_per_truck).toFixed(1)},${y(p.mean_abs_error).toFixed(1)}`).join(' ');
  const yTicks = [0, maxY / 2, maxY];
  const xTicks = [0, Math.round(maxX / 2), Math.round(maxX)];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sb-chart" role="img"
      aria-label={`Learning error falls from ${series[0].mean_abs_error} to ${series[series.length - 1].mean_abs_error} after ${maxX} trips per truck`}>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="sb-grid" />
          <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" className="sb-axis">{tick.toFixed(3)}</text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <text key={tick} x={x(tick)} y={height - pad.bottom + 18} textAnchor="middle" className="sb-axis">{tick}</text>
      ))}
      <text x={(width + pad.left) / 2} y={height - 4} textAnchor="middle" className="sb-axis">trips per truck</text>
      <line x1={pad.left} x2={width - pad.right} y1={y(calibration.no_learning_error)} y2={y(calibration.no_learning_error)} className="sb-baseline" />
      <text x={width - pad.right} y={y(calibration.no_learning_error) - 6} textAnchor="end" className="sb-axis">without learning</text>
      <path d={line} className="sb-line" />
      {series.map((p) => (
        <circle key={p.trips_per_truck} cx={x(p.trips_per_truck)} cy={y(p.mean_abs_error)} r="2.5" className="sb-dot" />
      ))}
    </svg>
  );
}
