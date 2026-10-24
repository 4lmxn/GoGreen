import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import api from '../../api/api';
import { PageHeader, ErrorNotice, Loading, Empty } from '../../components/Operations';

const EMPTY_FORM = { vehicle_no: '', type: '', fuel_type: 'Diesel', load_capacity_kg: 1000, emission_factor_g_per_km: 120, assigned_driver_id: '', status: 'active' };
const FUEL_TYPES = ['Diesel', 'Petrol', 'Electric', 'Hybrid', 'CNG'];
const STATUSES = ['active', 'maintenance', 'retired'];

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  const fetchVehicles = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch { setError('Failed to load vehicles'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditVehicle(null); setShowModal(true); setMsg(''); };
  const openEdit = (v) => {
    setForm({ vehicle_no: v.vehicle_no, type: v.type, fuel_type: v.fuel_type, load_capacity_kg: v.load_capacity_kg, emission_factor_g_per_km: v.emission_factor_g_per_km, assigned_driver_id: v.assigned_driver_id || '', status: v.status });
    setEditVehicle(v); setShowModal(true); setMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      if (editVehicle) {
        await api.patch(`/vehicles/${editVehicle.id}`, { ...form, assigned_driver_id: form.assigned_driver_id || null });
      } else {
        await api.post('/vehicles', { ...form, assigned_driver_id: form.assigned_driver_id || null });
      }
      setShowModal(false); fetchVehicles(); setMsg(editVehicle ? 'Vehicle updated' : 'Vehicle created');
    } catch (err) { setMsg(err.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      fetchVehicles(); setMsg('Vehicle deleted');
    } catch { setMsg('Failed to delete vehicle'); }
  };

  const inputClass = 'op-input';
  const labelClass = 'block text-xs font-semibold text-neutral-textMain';

  // Map vehicle status onto the shared status chips.
  const STATUS_CHIP = { active: 'in_progress', maintenance: 'planned', retired: '' };

  return (
    <div className="op-page">
      <PageHeader
        eyebrow="Admin · vehicles"
        title="Vehicles"
        description="The vehicle type and fuel decide how its fuel is predicted. Use car, van, truck or heavy truck."
        action={<Button variant="primary" onClick={openCreate}><Plus size={16} />Add vehicle</Button>}
      />
      {msg && !showModal && <p className="op-success" role="status">{msg}</p>}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNotice>{error}</ErrorNotice>
      ) : vehicles.length === 0 ? (
        <Card>
          <Empty title="No vehicles yet">Add a vehicle and give it to a driver.</Empty>
        </Card>
      ) : (
        <Card className="flush">
          <div className="op-table-wrap">
            <table className="op-table">
              <thead>
                <tr>
                  {['Plate', 'Type', 'Fuel', 'Capacity kg', 'Factor g/km', 'Driver', 'Status', ''].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="op-num font-semibold">{v.vehicle_no}</td>
                    <td>{v.type}</td>
                    <td>{v.fuel_type}</td>
                    <td>{v.load_capacity_kg?.toLocaleString()}</td>
                    <td>{v.emission_factor_g_per_km ?? '—'}</td>
                    <td>{v.assigned_driver_name || '—'}</td>
                    <td><span className={`op-status ${STATUS_CHIP[v.status] || ''}`}>{v.status}</span></td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(v)} className="op-icon-button" aria-label={`Edit ${v.vehicle_no}`}><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(v.id)} className="op-icon-button" aria-label={`Delete ${v.vehicle_no}`}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editVehicle ? 'Edit vehicle' : 'Add vehicle'}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {msg && <ErrorNotice>{msg}</ErrorNotice>}
          <div>
            <label className={labelClass}>Plate number</label>
            <input className={inputClass} value={form.vehicle_no} onChange={set('vehicle_no')} required disabled={!!editVehicle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <input className={inputClass} placeholder="Van, truck, heavy truck" value={form.type} onChange={set('type')} required />
            </div>
            <div>
              <label className={labelClass}>Fuel</label>
              <select className={inputClass} value={form.fuel_type} onChange={set('fuel_type')}>
                {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Load capacity (kg)</label>
              <input type="number" className={inputClass} value={form.load_capacity_kg} onChange={set('load_capacity_kg')} />
            </div>
            <div>
              <label className={labelClass}>Legacy emission factor (g/km)</label>
              <input type="number" className={inputClass} value={form.emission_factor_g_per_km} onChange={set('emission_factor_g_per_km')} />
            </div>
            <div>
              <label className={labelClass}>Driver ID (optional)</label>
              <input type="number" className={inputClass} placeholder="Driver ID" value={form.assigned_driver_id} onChange={set('assigned_driver_id')} />
            </div>
            {editVehicle && (
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status} onChange={set('status')}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? <Loader className="animate-spin" size={16} /> : editVehicle ? 'Save changes' : 'Create vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
