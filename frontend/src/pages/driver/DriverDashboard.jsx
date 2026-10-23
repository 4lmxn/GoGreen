import { Link } from 'react-router-dom';
import { ArrowUpRight, Route, Leaf, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePolling, PageHeader, ErrorNotice, Loading, Metric, TripList, amount } from '../../components/Operations';

export default function DriverDashboard() {
  const { user } = useAuth();
  const { data, error, loading } = usePolling('/trips/history');
  const vehicle = user?.driver?.vehicle;
  const trips = data?.trips || [];
  const active = trips.find(t => t.status === 'in_progress');
  const completed = trips.filter(t => t.status === 'completed');
  const comparable = completed.filter(t => t.selectedRoute);
  const savings = comparable.reduce((sum, t) => sum + (t.estimatedSavingsKg || 0), 0);
  const distance = comparable.reduce((sum, t) => sum + t.selectedRoute.distanceKm, 0);
  return <div className="op-page"><PageHeader eyebrow="GOGREEN / DRIVER SPACE" title={`Good to see you, ${user?.name?.split(' ')[0] || 'driver'}.`} description="A clear plan. A connected journey. A little less impact." /><ErrorNotice>{error}</ErrorNotice><section className="op-hero"><div><p className="op-eyebrow">YOUR NEXT CHAPTER</p><h2>{active ? 'Your journey is in motion.' : 'Where will you go today?'}</h2><p>{active ? `${active.origin} to ${active.destination}. Resume your trip to share location and record its completion.` : vehicle ? 'Compare road alternatives for your vehicle, choose a route, and keep your fleet in the loop.' : 'Your account is ready. Ask your administrator to assign a vehicle before planning your first trip.'}</p>{(vehicle || active) && <Link className="op-button" to={active ? `/driver/active-trip/${active.id}` : '/driver/new-trip'}>{active ? 'Resume active trip' : 'Plan a new journey'} <ArrowUpRight size={16} /></Link>}</div><div className="op-orbit"><Route size={38} /><span style={{ marginTop: 10 }}>drive with purpose</span></div></section>{loading ? <Loading /> : <><div className="op-metrics"><Metric label="Completed journeys" value={completed.length} note="Within your latest 100 trips" icon={Route} /><Metric label="Net estimated CO₂ avoided" value={amount(savings)} unit="kg" note="Modeled against fastest alternatives" icon={Leaf} /><Metric label="Planned distance completed" value={amount(distance)} unit="km" note="Trips with saved route selections" icon={Route} /><Metric label="Your vehicle" value={vehicle?.vehicle_no || 'Unassigned'} note={vehicle ? `${vehicle.type} · ${vehicle.load_capacity_kg} kg capacity` : 'Contact your fleet administrator'} icon={Car} /></div><section className="op-panel"><div className="op-panel-heading"><div><h2>Your recent journeys</h2><p>Resume a plan or return to an active trip</p></div><Link className="op-small-link" to="/driver/history">View history <ArrowUpRight size={15} /></Link></div><TripList trips={trips.slice(0, 5)} driver /></section></>}</div>;
}
