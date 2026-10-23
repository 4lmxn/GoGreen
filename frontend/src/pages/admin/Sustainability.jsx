import { Leaf, Route, TrendingUp } from 'lucide-react';
import {
  usePolling, PageHeader, RefreshButton, ErrorNotice, Loading, Metric, ActivityChart, amount,
} from '../../components/Operations';

export default function Sustainability() {
  const { data, error, loading, reload } = usePolling('/admin/stats');

  return (
    <div className="op-page">
      <PageHeader
        eyebrow="Admin · emissions"
        title="Emissions"
        description="Modelled CO₂ of completed trips and the signed difference against the fastest road option for the same vehicle and cargo."
        action={<RefreshButton onClick={reload} />}
      />
      <ErrorNotice>{error}</ErrorNotice>

      {loading ? <Loading /> : data && (
        <>
          <div className="op-metrics">
            <Metric lead label="Net CO₂ avoided" value={amount(data.co2_saved_kg)} unit="kg" note="Negative would mean extra emissions" icon={Leaf} />
            <Metric label="CO₂ of chosen routes" value={amount(data.predicted_co2_kg)} unit="kg" note="Predicted, not measured" icon={TrendingUp} />
            <Metric label="Comparable trips" value={data.comparable_trips} note={`Of ${data.total_trips} completed trips`} icon={Route} />
            <Metric label="Distance" value={amount(data.distance_km)} unit="km" note="Comparable trips only" icon={Route} />
          </div>

          <section className="op-panel">
            <div className="op-panel-heading">
              <div>
                <h2>Comparable trips per day</h2>
                <p>Last 7 days · UTC</p>
              </div>
            </div>
            <ActivityChart days={data.daily} />
          </section>

          <section className="op-panel">
            <h2>How savings are calculated</h2>
            <p className="op-description">
              Each plan scores every road option for the same vehicle and cargo with the physics model:
              rolling resistance, air drag, climbing, turns and accessories, using live road speeds,
              terrain and weather. Savings are the fastest option&apos;s predicted CO₂ minus the chosen
              option&apos;s, kept with their sign. Only completed trips with a saved choice count.
            </p>
            <p className="op-description">
              These are model estimates. Live traffic is not included. Driver-reported fuel calibrates each
              vehicle over time (see Evidence and feedback), but a measured saving needs metered fuel on
              both routes.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
