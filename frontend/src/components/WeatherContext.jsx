import { useState } from 'react';
import { CloudSun } from 'lucide-react';
import { usePolling, ErrorNotice, Metric, amount, formatDate } from './Operations';

const locations = {
  Bengaluru: [12.972, 77.594], Mysuru: [12.296, 76.639],
  Chennai: [13.083, 80.271], Mumbai: [19.076, 72.878],
  Delhi: [28.614, 77.209], Hyderabad: [17.385, 78.487],
};

function WeatherReading({ city }) {
  const [lat, lon] = locations[city];
  const { data, loading, error, reload } = usePolling(`/context/weather?latitude=${lat}&longitude=${lon}`, 600000);
  const current = data?.current;
  const stale = Boolean(error || data?.status !== 'available');
  return <>
    <div className="op-row" style={{ margin: '16px 0' }}>
      <span className={`op-live ${stale ? 'stale' : ''}`}><i />{loading ? 'Fetching public weather…' : error ? 'Connection lost' : data?.status === 'available' ? 'Current model data' : data?.status === 'stale' ? 'Stale model data' : 'Weather unavailable'}</span>
      <button type="button" className="op-small-link" onClick={reload}>Check again</button>
    </div>
    <ErrorNotice>{error || data?.warning}</ErrorNotice>
    {current && <div className="op-metrics">
      <Metric label="Air temperature" value={amount(current.temperature_2m)} unit={data.units.temperature_2m} note="Modeled at 2 m above ground" />
      <Metric label="Precipitation" value={amount(current.precipitation)} unit={data.units.precipitation} note="Provider current interval" />
      <Metric label="Wind speed" value={amount(current.wind_speed_10m)} unit={data.units.wind_speed_10m} note="Modeled at 10 m above ground" />
      <Metric label="Provider data age" value={amount(Math.max(0, data.source_age_seconds) / 60)} unit="min" note={data.cached ? 'Served from server cache' : 'Fetched from public provider'} />
    </div>}
    <p className="op-note" style={{ marginTop: 14 }}>Valid at {formatDate(data?.valid_at)} · fetched {formatDate(data?.fetched_at)}. City-center coordinates: {lat}, {lon}. Checks every 10 minutes; timestamps are shown in your local time.</p>
    <p className="op-note"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="op-small-link">Weather data by Open-Meteo (CC BY 4.0)</a> · Weather-model estimates, not station observations.</p>
  </>;
}

export default function WeatherContext() {
  const [city, setCity] = useState('Bengaluru');
  return <section className="op-panel">
    <div className="op-panel-heading"><div><h2><CloudSun size={18} style={{ display: 'inline', marginRight: 8 }} />Public weather context</h2><p>Inspect current conditions from a public API, with provenance and freshness.</p></div><label className="op-note">City<select className="op-input" value={city} onChange={event => setCity(event.target.value)}>{Object.keys(locations).map(name => <option key={name}>{name}</option>)}</select></label></div>
    <p className="op-description">This feed provides context only. It does not change fuel predictions or route rankings, and it is not live traffic. Weather availability is not evidence of fuel-model accuracy.</p>
    <WeatherReading key={city} city={city} />
  </section>;
}
