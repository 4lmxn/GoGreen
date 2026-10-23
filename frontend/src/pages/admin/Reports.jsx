import { useState } from 'react';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import api from '../../api/api';
import { PageHeader, ErrorNotice } from '../../components/Operations';

export default function Reports() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function download(type) {
    setBusy(type); setError('');
    try {
      const { data } = await api.get(`/reports/export/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url; link.download = `gogreen-report.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('The report could not be downloaded. Check your connection and try again.'); }
    finally { setBusy(''); }
  }
  return <div className="op-page"><PageHeader eyebrow="GOGREEN / REPORTS" title="Take the bigger picture with you." description="Export saved fleet activity with a clear separation between predictions and recorded measurements." /><ErrorNotice>{error}</ErrorNotice><div className="op-columns">{[{ type: 'excel', title: 'Journey workbook', icon: FileSpreadsheet, description: 'Completed trips, selected routes, prediction sources, timestamps, and measured fuel where recorded.' }, { type: 'pdf', title: 'Fleet impact summary', icon: FileText, description: 'A concise overview of completed journeys, comparable route estimates, and the methodology behind them.' }].map(({ type, title, icon: Icon, description }) => <section className="op-panel op-stack" key={type}><Icon size={32} color="#487d60" /><h2>{title}</h2><p className="op-description">{description}</p><button onClick={() => download(type)} disabled={!!busy} className="op-button"><Download size={16} />{busy === type ? 'Preparing report…' : `Download ${type === 'excel' ? 'Excel' : 'PDF'}`}</button></section>)}</div></div>;
}
