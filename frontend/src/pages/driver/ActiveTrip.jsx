import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation, Flag, MapPin } from 'lucide-react';
import api from '../../api/api';
import MapView from '../../components/MapView';
import { usePolling, PageHeader, ErrorNotice, Loading, Metric, errorMessage, amount, formatDate } from '../../components/Operations';

export default function ActiveTrip() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: trip, error, loading, reload } = usePolling(`/trips/${id}`);
  const [gps, setGps] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('Waiting for device location permission…');
  const [actionError, setActionError] = useState('');
  const [fuel, setFuel] = useState('');
  const [busy, setBusy] = useState(false);
  const active = trip?.status === 'in_progress';
  useEffect(() => {
    if (!active) return;
    if (!navigator.geolocation) { setGpsStatus('Location is unavailable in this browser.'); return; }
    let lastSent = 0, pending = false, alive = true;
    const watch = navigator.geolocation.watchPosition(async position => {
      const coords = [position.coords.latitude, position.coords.longitude];
      if (!alive) return;
      setGps(coords);
      if (pending || Date.now() - lastSent < 10000) return;
      pending = true; lastSent = Date.now();
      try {
        await api.post(`/trips/${id}/log`, { lat: coords[0], lng: coords[1] });
        if (alive) setGpsStatus(`Location shared at ${new Date().toLocaleTimeString()} · device accuracy ±${Math.round(position.coords.accuracy)} m`);
      } catch (err) { if (alive) setGpsStatus(`Location not shared: ${errorMessage(err)}`); }
      finally { pending = false; }
    }, err => { if (alive) setGpsStatus(err.code === 1 ? 'Location permission denied. Enable it in your browser to share GPS with the fleet.' : 'Waiting for a GPS fix. Your trip is still saved.'); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    return () => { alive = false; navigator.geolocation.clearWatch(watch); };
  }, [id, active]);
  async function finish(event) {
    event.preventDefault(); setBusy(true); setActionError('');
    try { await api.post(`/trips/${id}/end`, fuel === '' ? {} : { actual_fuel_l: Number(fuel) }); navigate('/driver/history'); }
    catch (err) { setActionError(errorMessage(err)); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!window.confirm('Cancel this trip? It will remain in your history as cancelled.')) return;
    setBusy(true); setActionError('');
    try { await api.post(`/trips/${id}/cancel`); navigate('/driver/history'); }
    catch (err) { setActionError(errorMessage(err)); } finally { setBusy(false); }
  }
  const route = trip?.selectedRoute;
  return <div className="op-page"><PageHeader eyebrow="GOGREEN / ON THE ROAD" title={trip ? `${trip.origin} → ${trip.destination}` : 'Your active journey'} description={trip ? `Trip #${trip.id} · ${trip.vehicleId} · ${trip.status.replace('_', ' ')}` : 'Loading your saved route'} action={<button className="op-button secondary" onClick={reload}>Refresh trip</button>} /><ErrorNotice>{actionError || error}</ErrorNotice>{loading ? <Loading /> : trip && <><div className="op-metrics"><Metric label="Planned distance" value={amount(route?.distanceKm)} unit="km" note="Selected road route" icon={Navigation} /><Metric label="Estimated duration" value={amount(route?.durationMin)} unit="min" note="At planning time · no live traffic" icon={Flag} /><Metric label="Predicted CO₂" value={amount(route?.co2Kg)} unit="kg" note={trip.predictionMode} icon={MapPin} /><Metric label="Net estimated CO₂ avoided" value={amount(trip.estimatedSavingsKg)} unit="kg" note="Compared with fastest alternative" icon={Flag} /></div><div className="op-planner"><div className="op-stack"><section className="op-panel"><h2>Location sharing</h2><p className="op-description" role="status">{active ? gpsStatus : `This trip is ${trip.status}; tracking has stopped.`}</p><p className="op-note">Last server update: {formatDate(trip.lastLocation?.timestamp)}. GPS sharing requires a secure connection or localhost.</p></section>{active && <section className="op-panel"><form onSubmit={finish} className="op-form"><h2>Arrived at your destination?</h2><p className="op-note">Confirm completion when your journey is finished. No arrival detection or fuel measurement is assumed.</p><FuelReportField unit={route?.fuelUnit || 'L'} value={fuel} onChange={setFuel} /><button disabled={busy} className="op-button">{busy ? 'Saving…' : 'Confirm journey complete'}</button><button disabled={busy} type="button" onClick={cancel} className="op-button danger">Cancel journey</button></form></section>}</div><div className="op-map"><MapView routes={trip.routes} selectedRouteId={trip.selectedRouteId} origin={trip.origin} destination={trip.destination} currentLocation={gps || (trip.lastLocation ? [trip.lastLocation.lat, trip.lastLocation.lng] : null)} /></div></div></>}</div>;
}

// Optional driver report of fuel (or kWh for electric vehicles). Each report
// updates this vehicle's calibration factor, so later predictions improve.
function FuelReportField({ unit, value, onChange }) {
  const unitName = { L: 'litres', kg: 'kg of CNG', kWh: 'kWh charged' }[unit] || unit;
  return (
    <label>
      Fuel used · {unitName}, optional
      <input
        className="op-input"
        type="number"
        min="0"
        max="1000000"
        step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Leave blank if fuel use is unknown"
      />
      <span className="op-note" style={{ display: 'block' }}>
        Your report trains this vehicle's calibration: the model compares it with its own prediction and adjusts future estimates. Implausible values are ignored.
      </span>
    </label>
  );
}
