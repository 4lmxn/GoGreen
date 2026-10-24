import { useState } from 'react';
import MapView from '../../components/MapView';
import { usePolling, PageHeader, ErrorNotice, Loading, Empty, RefreshButton, formatDate } from '../../components/Operations';

const FRESH_MS = 60000;

function isFresh(trip) {
  return trip.lastLocation && Date.now() - new Date(trip.lastLocation.timestamp).getTime() < FRESH_MS;
}

function gpsLabel(trip, error) {
  if (error) return 'Connection lost';
  if (!trip.lastLocation) return 'Waiting for GPS';
  return isFresh(trip) ? 'Live GPS' : 'Location stale';
}

function FleetCard({ trip, selected, error, onSelect }) {
  return (
    <button onClick={onSelect} className={`op-fleet-card ${selected ? 'selected' : ''}`}>
      <strong>{trip.driverName}</strong>
      <span className={`op-live ${!isFresh(trip) || error ? 'stale' : ''}`}>
        <i />{gpsLabel(trip, error)}
      </span>
      <p>{trip.origin} → {trip.destination}</p>
      <p className="op-num">#{trip.id} · {trip.vehicleId}</p>
      <p className="op-num">Last fix {formatDate(trip.lastLocation?.timestamp)}</p>
    </button>
  );
}

export default function LiveFleetMap() {
  const { data, error, loading, reload } = usePolling('/admin/fleet', 15000);
  const [selectedId, setSelectedId] = useState(null);
  const trips = data?.trips || [];
  const trip = trips.find((t) => t.id === selectedId) || trips[0];

  return (
    <div className="op-page">
      <PageHeader
        eyebrow="Admin · live fleet"
        title="Live fleet"
        description="Trucks on the road right now, from each driver's phone GPS. Updates every 15 seconds."
        action={<RefreshButton onClick={reload} />}
      />
      <ErrorNotice>{error}</ErrorNotice>

      {loading ? <Loading /> : !trips.length ? (
        <section className="op-panel">
          <Empty title="No trips in progress">A trip shows here when a driver starts it.</Empty>
        </section>
      ) : (
        <div className="op-fleet-grid">
          <div className="op-stack">
            {trips.map((t) => (
              <FleetCard key={t.id} trip={t} selected={trip.id === t.id} error={error} onSelect={() => setSelectedId(t.id)} />
            ))}
          </div>
          <div className="op-stack">
            <div className="op-map">
              <MapView
                routes={trip.routes}
                selectedRouteId={trip.selectedRouteId}
                origin={trip.origin}
                destination={trip.destination}
                currentLocation={trip.lastLocation ? [trip.lastLocation.lat, trip.lastLocation.lng] : null}
              />
            </div>
            <p className="op-note">
              {trip.lastLocation
                ? 'The pulsing dot is where the phone last sent its location.'
                : 'No location yet. Showing the planned road.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
