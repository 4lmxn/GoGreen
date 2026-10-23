import WeatherContext from '../../components/WeatherContext';
import { usePolling, PageHeader, RefreshButton, ErrorNotice, Loading, Metric, Empty, amount, formatDate } from '../../components/Operations';
import { CalibrationTable } from '../../components/ModelViews';

export default function Learning() {
  const { data, error, loading, reload } = usePolling('/admin/learning');

  return (
    <div className="op-page">
      <PageHeader
        eyebrow="Admin · evidence and feedback"
        title="Evidence and feedback"
        description="Predicted fuel against what drivers reported, and the per-vehicle calibration learned from it. Demo fixtures are excluded."
        action={<RefreshButton onClick={reload} />}
      />
      <ErrorNotice>{error}</ErrorNotice>
      {loading ? <Loading /> : data && <LearningReport data={data} />}
      <WeatherContext />
    </div>
  );
}

function LearningReport({ data }) {
  return (
    <>
      <div className="op-metrics">
        <Metric lead label="Reported trips" value={data.reported_trips} note={`${data.eligible_trips} eligible completed trips`} />
        <Metric label="Reporting coverage" value={data.coverage_percent} unit="%" note="Missing reports are not counted as zero fuel" />
        <Metric label="Mean absolute error" value={data.mae_l == null ? '—' : amount(data.mae_l)} unit="L" note="Unverified operational reports" />
        <Metric label="Mean signed error" value={data.bias_l == null ? '—' : amount(data.bias_l)} unit="L" note="Reported minus predicted; negative = overprediction" />
      </div>

      <section className="op-panel">
        <h2>How the model learns</h2>
        <p className="op-description">
          <strong>Model estimates</strong> come from a physics model of the forces on the vehicle (rolling resistance, air drag,
          climbing, turns and accessories) using real road speeds, terrain and weather.
          <strong> Driver reports</strong> are manually entered fuel outcomes. <strong>Demo fixtures</strong> are illustrative
          records and are excluded from these error metrics.
        </p>
        <p className="op-description">
          Each plausible report updates that vehicle's calibration factor, a multiplier that corrects the physics estimate toward
          what the vehicle really uses. Reports far outside the prediction are ignored so one typo cannot skew a vehicle.
        </p>
        <p className="op-description">
          Reports describe the trips actually driven, not what an untraveled alternative would have used. They are driver-entered
          and unverified, so this is an operational check rather than a controlled accuracy test.
        </p>
      </section>

      <section className="op-panel">
        <div className="op-panel-heading">
          <h2>Per-vehicle calibration</h2>
          <span className="op-note">Factor × physics estimate = prediction</span>
        </div>
        <CalibrationTable rows={data.calibration} />
      </section>

      <section className="op-panel">
        <div className="op-panel-heading">
          <h2>Prediction versus outcome</h2>
          <span className="op-note">Latest 30 reports</span>
        </div>
        {!data.records.length ? (
          <Empty title="No fuel reports yet">
            Complete a trip and report the fuel used to begin tracking prediction errors.
          </Empty>
        ) : (
          data.records.map((record) => <ReportRow key={record.trip_id} record={record} />)
        )}
      </section>
    </>
  );
}

function ReportRow({ record }) {
  return (
    <article className="op-trip-row">
      <div className="op-trip-main">
        <strong>#{record.trip_id} · {record.origin} → {record.destination}</strong>
        <p>{record.model} · {formatDate(record.completed_at)}</p>
      </div>
      <div>
        <strong className="op-num">{amount(record.predicted_l)} predicted / {amount(record.reported_l)} reported</strong>
        <p>{record.error_l > 0 ? '+' : ''}{amount(record.error_l)} error · unverified</p>
      </div>
    </article>
  );
}
