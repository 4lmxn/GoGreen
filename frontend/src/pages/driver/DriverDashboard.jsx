import { Link } from 'react-router-dom';
import { ArrowUpRight, Route, Leaf, Car, Navigation } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePolling, PageHeader, ErrorNotice, Loading, Metric, TripList, amount } from '../../components/Operations';

/** The one thing the driver should do next: resume the active trip, or plan one. */
function NextAction({ active, vehicle }) {
  if (active) {
    return (
      <Link className="op-button" to={`/driver/active-trip/${active.id}`}>
        Resume {active.origin} → {active.destination} <ArrowUpRight size={16} />
      </Link>
    );
  }
  if (vehicle) {
    return (
      <Link className="op-button" to="/driver/new-trip">
        Plan a trip <ArrowUpRight size={16} />
      </Link>
    );
  }
  return null;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const { data, error, loading } = usePolling('/trips/history');
  const vehicle = user?.driver?.vehicle;
  const trips = data?.trips || [];
  const active = trips.find((trip) => trip.status === 'in_progress');
  const completed = trips.filter((trip) => trip.status === 'completed');
  const comparable = completed.filter((trip) => trip.selectedRoute);
  const savings = comparable.reduce((sum, trip) => sum + (trip.estimatedSavingsKg || 0), 0);
  const distance = comparable.reduce((sum, trip) => sum + trip.selectedRoute.distanceKm, 0);

  const description = active
    ? `Trip #${active.id} is in progress. Resume it to keep sharing your location.`
    : vehicle
      ? 'Compare real road options for your vehicle, pick one and start tracking.'
      : 'Your administrator needs to assign a vehicle before you can plan a trip.';

  return (
    <div className="op-page">
      <PageHeader
        eyebrow="Driver"
        title={`Hello, ${user?.name?.split(' ')[0] || 'driver'}`}
        description={description}
        action={<NextAction active={active} vehicle={vehicle} />}
      />
      <ErrorNotice>{error}</ErrorNotice>

      {loading ? <Loading /> : (
        <>
          <div className="op-metrics">
            <Metric
              lead
              label="Your vehicle"
              value={vehicle?.vehicle_no || 'Unassigned'}
              note={vehicle ? `${vehicle.type} · ${vehicle.load_capacity_kg} kg capacity` : 'Ask your fleet administrator'}
              icon={Car}
            />
            <Metric label="Status" value={active ? 'On the road' : 'Parked'} note={active ? `${active.origin} → ${active.destination}` : 'No active trip'} icon={Navigation} />
            <Metric label="Completed trips" value={completed.length} note="Within your latest 100 trips" icon={Route} />
            <Metric label="Net CO₂ avoided" value={amount(savings)} unit="kg" note={`Over ${amount(distance)} km · modelled vs fastest route`} icon={Leaf} />
          </div>

          <section className="op-panel">
            <div className="op-panel-heading">
              <div>
                <h2>Recent trips</h2>
                <p>Open a planned trip or return to the active one</p>
              </div>
              <Link className="op-small-link" to="/driver/history">All trips <ArrowUpRight size={15} /></Link>
            </div>
            <TripList trips={trips.slice(0, 5)} driver />
          </section>
        </>
      )}
    </div>
  );
}
