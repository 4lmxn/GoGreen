import { useState } from 'react';
import MapView from '../../components/MapView';
import { usePolling, PageHeader, ErrorNotice, Loading, Empty, RefreshButton, formatDate } from '../../components/Operations';

export default function LiveFleetMap() {
  const { data, error, loading, reload } = usePolling('/admin/fleet', 15000);
  const [selectedId, setSelectedId] = useState(null);
  const trips = data?.trips || [];
  const trip = trips.find(t => t.id === selectedId) || trips[0];
  const fresh = t => t.lastLocation && Date.now() - new Date(t.lastLocation.timestamp).getTime() < 60000;
  return <div className="op-page"><PageHeader eyebrow="GOGREEN / FLEET LIVE" title="Connected on the road." description="Server-received driver locations. Updates every 15 seconds; positions older than a minute are marked stale." action={<RefreshButton onClick={reload} />} /><ErrorNotice>{error}</ErrorNotice>{loading ? <Loading /> : !trips.length ? <section className="op-panel"><Empty title="No active trips right now">When a driver starts a saved journey, it appears here. Positions are shown only after the driver shares GPS.</Empty></section> : <div className="op-fleet-grid"><div className="op-stack">{trips.map(t => <button key={t.id} onClick={() => setSelectedId(t.id)} className={`op-fleet-card ${trip.id === t.id ? 'selected' : ''}`}><strong>{t.driverName}</strong><span className={`op-live ${!fresh(t) || error ? 'stale' : ''}`}><i />{error ? 'Connection lost' : !t.lastLocation ? 'Waiting for GPS' : fresh(t) ? 'Recent GPS' : 'Location stale'}</span><p>{t.origin} → {t.destination}</p><p>#{t.id} · {t.vehicleId}</p><p>Last seen: {formatDate(t.lastLocation?.timestamp)}</p></button>)}</div><div className="op-stack"><div className="op-map"><MapView routes={trip.routes} selectedRouteId={trip.selectedRouteId} origin={trip.origin} destination={trip.destination} currentLocation={trip.lastLocation ? [trip.lastLocation.lat, trip.lastLocation.lng] : null} /></div><p className="op-note">{trip.lastLocation ? 'The location marker shows the last saved GPS position, not a simulated vehicle.' : 'Only the planned route is shown. No device position has been received.'}</p></div></div>}</div>;
}
