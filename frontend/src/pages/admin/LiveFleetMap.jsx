import { useEffect, useMemo, useState } from 'react';
import api from '../../api/api';
import MapView from '../../components/MapView';
import { usePolling, PageHeader, ErrorNotice, Loading, Empty, RefreshButton, formatDate, amount } from '../../components/Operations';
import { roundMapLayers, lastPosition, RoundProgress, StopList } from '../../components/RoundViews';

const FRESH_MS = 60000;

// Leaflet circles cannot read CSS variables, so these repeat the design tokens.
const SIM_COLOURS = {
  driving: '#1b6a45',
  delivering: '#c08a2e',
  returning: '#6fa58a',
  idle: '#8a9690',
  done: '#b9c4bd',
};
const SIM_LABELS = {
  driving: 'Driving',
  delivering: 'Unloading',
  returning: 'Returning',
  idle: 'At depot',
  done: 'Done',
};

// Minutes since local midnight, kept inside the simulated working day.
function simMinute(day) {
  const now = new Date();
  const minute = now.getHours() * 60 + now.getMinutes();
  return Math.min(day.end_min, Math.max(day.start_min, minute));
}

/** Simulated trucks from Fleet sandbox at the current time of day, refreshed every 15 s. */
function useSimFleet(enabled) {
  const [sim, setSim] = useState({ exists: false, state: null });
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    async function load() {
      try {
        const { data: status } = await api.get('/sim/status');
        if (status.phase !== 'ready') {
          if (alive) setSim({ exists: false, state: null });
          return;
        }
        const { data: state } = await api.get('/sim/state', { params: { t: simMinute(status.day) } });
        if (alive) setSim({ exists: true, state });
      } catch {
        if (alive) setSim({ exists: false, state: null });
      }
    }
    load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [enabled]);
  return sim;
}

function simDots(state) {
  if (!state) return [];
  const trucks = state.trucks.map((truck) => ({
    lat: truck.lat,
    lng: truck.lng,
    color: SIM_COLOURS[truck.status],
    radius: 4,
    title: `Simulation · ${truck.plate} · ${SIM_LABELS[truck.status]} · ${truck.load_kg} kg`,
  }));
  const depots = state.depots.map((depot) => ({
    lat: depot.lat, lng: depot.lng, color: '#e0a32e', radius: 9, title: `Simulation depot · ${depot.name}`,
  }));
  return [...trucks, ...depots];
}

function clock(minute) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** Toggle, tag and KPI line for the sandbox fleet. */
function SimBar({ show, onToggle, sim }) {
  const kpis = sim.state?.kpis;
  return (
    <section className="op-panel gg-sim-bar">
      <label className="op-row" style={{ fontWeight: 600 }}>
        <input type="checkbox" checked={show} onChange={(e) => onToggle(e.target.checked)} />
        Show sandbox fleet (simulation)
      </label>
      {show && sim.exists && kpis && (
        <>
          <span className="gg-sim-tag">SIMULATION — synthetic orders</span>
          <span className="op-num gg-sim-kpis">
            {clock(sim.state.sim_time)} · {kpis.on_road} on the road · {kpis.delivered} / {kpis.orders_total} delivered · {amount(kpis.co2_kg)} kg CO₂ so far
          </span>
        </>
      )}
      {show && !sim.exists && (
        <span className="op-note">Build a day in Fleet sandbox to see 150 trucks here.</span>
      )}
    </section>
  );
}

function isFresh(location) {
  return location && Date.now() - new Date(location.timestamp).getTime() < FRESH_MS;
}

function gpsLabel(location, error) {
  if (error) return 'Connection lost';
  if (!location) return 'Waiting for GPS';
  return isFresh(location) ? 'Live GPS' : 'Location stale';
}

function GpsState({ location, error }) {
  return (
    <span className={`op-live ${!isFresh(location) || error ? 'stale' : ''}`}>
      <i />{gpsLabel(location, error)}
    </span>
  );
}

function TripCard({ trip, selected, error, onSelect }) {
  return (
    <button onClick={onSelect} className={`op-fleet-card ${selected ? 'selected' : ''}`}>
      <strong>{trip.driverName}</strong>
      <GpsState location={trip.lastLocation} error={error} />
      <p>Trip · {trip.origin} → {trip.destination}</p>
      <p className="op-num">#{trip.id} · {trip.vehicleId}</p>
      <p className="op-num">Last fix {formatDate(trip.lastLocation?.timestamp)}</p>
    </button>
  );
}

function RoundCard({ round, selected, error, onSelect }) {
  return (
    <button onClick={onSelect} className={`op-fleet-card ${selected ? 'selected' : ''}`}>
      <strong>{round.driver?.name}</strong>
      <GpsState location={round.last_location} error={error} />
      <p>Round · {round.delivered_count} of {round.stop_count} stops delivered</p>
      <p className="op-num">#{round.id} · {round.vehicle?.vehicle_no} · {amount(round.load_now_kg)} kg left</p>
      <p className="op-num">Last fix {formatDate(round.last_location?.timestamp)}</p>
    </button>
  );
}

function SimLegend() {
  return (
    <p className="op-note gg-sim-legend">
      <span className="gg-sim-tag">SIMULATION</span>
      {Object.entries(SIM_LABELS).map(([key, label]) => (
        <span key={key}><i style={{ background: SIM_COLOURS[key] }} />{label}</span>
      ))}
      <span><i style={{ background: '#e0a32e' }} />Depot</span>
    </p>
  );
}

function TripMap({ trip, dots }) {
  return (
    <>
      <div className="op-map">
        <MapView
          routes={trip.routes}
          selectedRouteId={trip.selectedRouteId}
          origin={trip.origin}
          destination={trip.destination}
          currentLocation={trip.lastLocation ? [trip.lastLocation.lat, trip.lastLocation.lng] : null}
          dots={dots}
        />
      </div>
      <p className="op-note">
        {trip.lastLocation ? 'The pulsing dot is where the phone last sent its location.' : 'No location yet. Showing the planned road.'}
      </p>
    </>
  );
}

function RoundMap({ round, dots }) {
  const { markers, lines } = useMemo(() => roundMapLayers(round), [round]);
  return (
    <>
      <div className="op-map">
        <MapView markers={markers} lines={lines} currentLocation={lastPosition(round)} dots={dots} />
      </div>
      <section className="op-panel">
        <div className="op-panel-heading">
          <h2>Round #{round.id}</h2>
          <p className="op-num">{round.delivered_count} / {round.stop_count} delivered</p>
        </div>
        <RoundProgress round={round} />
        <StopList round={round} />
      </section>
    </>
  );
}

export default function LiveFleetMap() {
  const { data, error, loading, reload } = usePolling('/admin/fleet', 15000);
  const [selectedKey, setSelectedKey] = useState(null);
  const [showSim, setShowSim] = useState(true);
  const sim = useSimFleet(showSim);
  const dots = useMemo(() => (showSim ? simDots(sim.state) : []), [showSim, sim.state]);
  const simVisible = dots.length > 0;

  // One list for both kinds of work on the road; keys keep trip #3 and round #3 apart.
  const items = [
    ...(data?.rounds || []).map((round) => ({ key: `round-${round.id}`, round })),
    ...(data?.trips || []).map((trip) => ({ key: `trip-${trip.id}`, trip })),
  ];
  const selected = items.find((item) => item.key === selectedKey) || items[0];

  return (
    <div className="op-page">
      <PageHeader
        eyebrow="Admin · live fleet"
        title="Live fleet"
        description="Rounds and trips on the road right now, from each driver's phone GPS. Updates every 15 seconds."
        action={<RefreshButton onClick={reload} />}
      />
      <ErrorNotice>{error}</ErrorNotice>
      <SimBar show={showSim} onToggle={setShowSim} sim={sim} />

      {loading ? <Loading /> : !items.length && !simVisible ? (
        <section className="op-panel">
          <Empty title="Nothing on the road">A round or trip shows here when a driver starts it.</Empty>
        </section>
      ) : !items.length ? (
        <div className="op-stack">
          <SimLegend />
          <div className="op-map"><MapView dots={dots} /></div>
          <p className="op-note">No real round or trip is on the road right now.</p>
        </div>
      ) : (
        <div className="op-fleet-grid">
          <div className="op-stack">
            {items.map((item) => (item.round ? (
              <RoundCard key={item.key} round={item.round} selected={item.key === selected.key} error={error} onSelect={() => setSelectedKey(item.key)} />
            ) : (
              <TripCard key={item.key} trip={item.trip} selected={item.key === selected.key} error={error} onSelect={() => setSelectedKey(item.key)} />
            )))}
          </div>
          <div className="op-stack">
            {simVisible && <SimLegend />}
            {selected.round ? <RoundMap round={selected.round} dots={dots} /> : <TripMap trip={selected.trip} dots={dots} />}
          </div>
        </div>
      )}
    </div>
  );
}
