import { Link } from 'react-router-dom';
import { usePolling, PageHeader, ErrorNotice, Loading, TripList, RefreshButton } from '../../components/Operations';

export default function TripHistory() {
  const { data, error, loading, reload } = usePolling('/trips/history');
  return <div className="op-page"><PageHeader eyebrow="GOGREEN / YOUR JOURNEYS" title="Every mile, remembered." description="Your latest 100 saved plans, active journeys, and completed trips. Available across your devices." action={<RefreshButton onClick={reload} />} /><ErrorNotice>{error}</ErrorNotice>{loading ? <Loading /> : <section className="op-panel"><div className="op-panel-heading"><h2>Journey history</h2><Link className="op-button" to="/driver/new-trip">Plan a journey</Link></div><TripList trips={data?.trips} driver /></section>}</div>;
}
