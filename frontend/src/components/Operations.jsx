import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw, Route, AlertCircle } from 'lucide-react';
import api from '../api/api';
import './operations.css';

export const errorMessage = (error) => error.response?.data?.message || 'Unable to connect. Check the server and try again.';
export const formatDate = (value) => value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not recorded';
export const amount = (value) => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });

export function usePolling(path, interval = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    let live = true, timer;
    const controller = new AbortController();
    async function load() {
      try {
        const res = await api.get(path, { signal: controller.signal });
        if (live) { setData(res.data); setError(''); }
      } catch (err) { if (live) setError(errorMessage(err)); }
      finally {
        if (live) { setLoading(false); timer = setTimeout(load, interval); }
      }
    }
    load();
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, [path, interval, revision]);
  return { data, error, loading, reload };
}

export function PageHeader({ eyebrow = 'GOGREEN / OPERATIONS', title, description, action }) {
  return <header className="op-header"><div><p className="op-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="op-description">{description}</p></div>{action}</header>;
}
export function RefreshButton({ onClick }) { return <button className="op-button secondary" onClick={onClick}><RefreshCw size={15} /> Refresh</button>; }
export function ErrorNotice({ children }) { return children ? <div className="op-error" role="alert"><AlertCircle size={18} /><span>{children}</span></div> : null; }
export function Empty({ title, children }) { return <div className="op-empty"><Route size={30} /><h3>{title}</h3><p>{children}</p></div>; }
export function Loading() { return <div className="op-loading" role="status"><RefreshCw size={20} className="animate-spin" /> Loading saved activity…</div>; }
export function Metric({ label, value, unit, note, icon: Icon }) {
  return <article className="op-metric"><div className="op-metric-top"><span>{label}</span>{Icon && <Icon size={18} />}</div><div className="op-value">{value}<small>{unit}</small></div><p>{note}</p></article>;
}
export function Status({ status }) { return <span className={`op-status ${status}`}>{status === 'in_progress' ? 'On the road' : status}</span>; }
export function ActivityChart({ days = [] }) {
  const max = Math.max(1, ...days.map(d => d.trips));
  return <div className="op-chart" aria-label="Completed comparable trips over the last seven UTC days">{days.map(day => <div className="op-bar-col" key={day.date}><span>{day.trips}</span><div className="op-bar-track"><div className="op-bar" style={{ height: `${day.trips / max * 100}%` }} title={`${day.date}: ${day.trips} trips, ${day.savings} kg estimated savings`} /></div><small>{day.label}</small></div>)}</div>;
}
export function TripList({ trips = [], driver = false }) {
  if (!trips.length) return <Empty title="Your next journey starts here">Saved trips will appear here as the fleet gets moving.</Empty>;
  return <div className="op-trip-list">{trips.map(trip => <article className="op-trip-row" key={trip.id}><div className="op-route-icon"><Route size={19} /></div><div className="op-trip-main"><strong>{trip.origin} <span className="op-muted">→</span> {trip.destination}</strong><p>#{trip.id} · {trip.driverName} · {trip.vehicleId}</p></div><div className="op-trip-detail"><strong>{trip.selectedRoute ? `${amount(trip.selectedRoute.distanceKm)} km` : 'Route pending'}</strong><p>{formatDate(trip.completedAt || trip.startedAt || trip.createdAt)}</p></div><Status status={trip.status} />{driver && ['planned', 'in_progress'].includes(trip.status) && <Link aria-label={`Open trip ${trip.id}`} className="op-icon-button" to={trip.status === 'planned' ? `/driver/new-trip?trip=${trip.id}` : `/driver/active-trip/${trip.id}`}><ArrowUpRight size={20} /></Link>}</article>)}</div>;
}
