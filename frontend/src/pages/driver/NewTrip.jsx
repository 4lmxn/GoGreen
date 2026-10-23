import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import api from '../../api/api';
import MapView from '../../components/MapView';
import { PageHeader, ErrorNotice, errorMessage, amount } from '../../components/Operations';

export default function NewTrip() {
  const [params, setParams] = useSearchParams();
  const savedId = params.get('trip');
  const navigate = useNavigate();
  const [source, setSource] = useState('Bengaluru');
  const [destination, setDestination] = useState('Mysuru');
  const [weight, setWeight] = useState('0');
  const [trip, setTrip] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!savedId) return;
    let live = true;
    setBusy(true);
    api.get(`/trips/${savedId}`).then(({ data }) => {
      if (!live) return;
      if (data.status === 'in_progress') { navigate(`/driver/active-trip/${data.id}`, { replace: true }); return; }
      setTrip(data); setSelected(data.selectedRouteId || data.routes.find(r => r.isDefault)?.id || data.routes.find(r => r.isAiRecommended)?.id || data.routes[0]?.id);
      setSource(data.origin); setDestination(data.destination); setWeight(String(data.loadWeight));
    }).catch(err => { if (live) setError(errorMessage(err)); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [savedId, navigate]);
  async function plan(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { data } = await api.post('/trips', { source, destination, load_weight_kg: Number(weight) });
      setTrip(data); setSelected(data.routes.find(r => r.isDefault)?.id || data.routes.find(r => r.isAiRecommended)?.id || data.routes[0]?.id); setParams({ trip: data.id });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  async function start() {
    setBusy(true); setError('');
    try {
      await api.patch(`/trips/${trip.id}/select-route`, { route_id: selected });
      await api.post(`/trips/${trip.id}/start`);
      navigate(`/driver/active-trip/${trip.id}`);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  async function discard() {
    setBusy(true); setError('');
    try { await api.post(`/trips/${trip.id}/cancel`); setTrip(null); setSelected(null); setParams({}); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  const routes = trip?.routes || [];
  return <div className="op-page"><PageHeader eyebrow="GOGREEN / PLAN A JOURNEY" title="Find your greener way." description="Compare real road alternatives for your assigned vehicle. Save your choice, then start tracking." /><ErrorNotice>{error}</ErrorNotice><div className="op-planner"><div className="op-stack"><section className="op-panel"><form onSubmit={plan} className="op-form"><label>Origin<input className="op-input" value={source} onChange={e => setSource(e.target.value)} required disabled={!!trip || busy} /></label><label>Destination<input className="op-input" value={destination} onChange={e => setDestination(e.target.value)} required disabled={!!trip || busy} /></label><label>Cargo weight · kg<input className="op-input" type="number" min="0" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} required disabled={!!trip || busy} /></label><p className="op-note">Cities: Bengaluru, Mysuru, Chennai, Mumbai, Delhi, Pune, Hyderabad, Hosur, Tumakuru, Kochi. You can also enter latitude,longitude. Routes use city centers unless coordinates are supplied.</p>{!trip ? <button disabled={busy} className="op-button">{busy ? 'Finding road alternatives…' : 'Compare routes'} <ArrowRight size={15} /></button> : trip.status === 'planned' ? <button type="button" className="op-button secondary" disabled={busy} onClick={discard}>Cancel this plan and start again</button> : <p className="op-note">This trip is {trip.status}. Open a new plan from the dashboard.</p>}</form></section>{routes.length > 0 && <><section className="op-panel"><h2>Why this route?</h2><p className="op-description">{routes[0]?.decisionPolicy?.reason}</p><p className="op-note">Evidence: synthetic training · confidence not calibrated · truck restrictions not verified.</p></section><p className="op-note">{trip.predictionMode} · assumed medium traffic and clear weather. When evidence permits, recommendation: lowest predicted total CO₂ within 15% of fastest time; improvements below 2% or 0.1 kg retain the fastest route. This threshold is not statistical confidence. Plans expire after 30 minutes. OSRM car routes are not certified truck routes.</p>{routes.map(route => <button key={route.id} disabled={busy || trip.status !== 'planned'} className={`op-route-card ${selected === route.id ? 'selected' : ''}`} onClick={() => setSelected(route.id)} aria-pressed={selected === route.id}><div className="op-row"><strong>{route.title}</strong>{selected === route.id && <Check size={16} />}</div><div className="op-route-values"><div><b>{amount(route.distanceKm)}</b><span>kilometers</span></div><div><b>{amount(route.durationMin)}</b><span>minutes</span></div><div><b>{amount(route.co2Kg)}</b><span>kg CO₂ estimate</span></div></div>{route.evidence?.limitations?.map(note => <p className="op-note" key={note}>⚠ {note}</p>)}<p className="op-note">{amount(route.fuelLiters)} L predicted · {route.isFastest ? 'Fastest alternative' : 'Alternative road route'}</p></button>)}{trip.status === 'planned' && <button disabled={busy || !selected} onClick={start} className="op-button">{busy ? 'Saving your journey…' : 'Start selected journey'} <ArrowRight size={16} /></button>}</>}</div><div className="op-stack"><div className="op-map"><MapView routes={routes} selectedRouteId={selected} origin={source} destination={destination} /></div><p className="op-note">Plans and selected routes are stored in your account. A provider failure never creates a successful journey.</p></div></div></div>;
}
