import { useEffect, useState } from 'react';
import { MessageCircle, Trash2, UserPlus, CalendarPlus } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Field, Spinner, useToast, Toggle } from './ui.jsx';
import { STATUS, cx, fmt, time12, waLink, gcalLink, money } from '../lib/utils';
import { useAuth } from '../lib/auth.jsx';

const blank = { client_id: '', service_id: '', date: '', time: '10:00', status: 'confirmed', price: '', notes: '', at_home: 0 };

/** Create or edit an appointment. `appt` = existing row, or {start_at} for a new one. */
export default function AppointmentModal({ open, appt, onClose, onSaved }) {
  const toast = useToast();
  const { studio } = useAuth();
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [f, setF] = useState(blank);
  const [newClient, setNewClient] = useState(null);
  const [busy, setBusy] = useState(false);
  const editing = !!appt?.id;

  useEffect(() => {
    if (!open) return;
    Promise.all([api('/services'), api('/clients')]).then(([s, c]) => { setServices(s); setClients(c); });
    const start = appt?.start_at || '';
    setF({
      ...blank, ...(appt || {}),
      date: start.slice(0, 10), time: start.slice(11, 16) || '10:00',
      price: appt?.price ?? '', client_id: appt?.client_id || '', service_id: appt?.service_id || '',
    });
    setNewClient(null);
  }, [open, appt]);

  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });

  const save = async (e, force = false) => {
    e?.preventDefault();
    setBusy(true);
    try {
      let client_id = f.client_id;
      if (newClient) {
        if (!newClient.name) throw new Error('Escribe el nombre de la clienta');
        client_id = (await api('/clients', { method: 'POST', body: newClient })).id;
      }
      const svc = services.find((s) => s.id === Number(f.service_id));
      const body = {
        client_id: client_id || null, service_id: f.service_id || null, start_at: `${f.date}T${f.time}`,
        status: f.status, notes: f.notes, at_home: f.at_home ? 1 : 0,
        price: f.price === '' ? (svc?.price ?? null) : Number(f.price), force,
      };
      if (editing) await api(`/appointments/${appt.id}`, { method: 'PUT', body });
      else await api('/appointments', { method: 'POST', body });
      toast(editing ? 'Cita actualizada' : 'Cita agendada ✨');
      onSaved?.(); onClose();
    } catch (err) {
      if (err.status === 409 && window.confirm(`${err.message}. ¿Guardar de todas formas?`)) { setBusy(false); return save(null, true); }
      toast(err.message, 'error');
    }
    setBusy(false);
  };

  const quick = async (status) => {
    await api(`/appointments/${appt.id}`, { method: 'PUT', body: { status } });
    toast(STATUS[status].label); onSaved?.(); onClose();
  };
  const remove = async () => {
    if (!window.confirm('¿Eliminar esta cita?')) return;
    await api(`/appointments/${appt.id}`, { method: 'DELETE' });
    toast('Cita eliminada'); onSaved?.(); onClose();
  };

  const svcName = appt?.service_name || services.find((s) => s.id === Number(f.service_id))?.name || 'tu cita';
  const reminder = editing && appt.client_phone && waLink(appt.client_phone,
    `Hola ${appt.client_name?.split(' ')[0] || ''} ✨ te recuerdo tu cita de ${svcName} en ${studio?.name} el ${fmt(appt.start_at, "EEEE d 'de' MMMM")} a las ${time12(appt.start_at.slice(11))}. ¿Me confirmas? 💅`);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Detalle de cita' : 'Nueva cita'}>
      {editing && (
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {['confirmed', 'done', 'no_show', 'cancelled'].filter((s) => s !== appt.status).map((s) => (
              <button key={s} onClick={() => quick(s)} className={cx('chip px-3 py-1.5', STATUS[s].cls)}>{STATUS[s].label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {reminder && <a href={reminder} target="_blank" rel="noreferrer" className="btn-ghost text-xs"><MessageCircle className="h-4 w-4" /> Recordatorio</a>}
            <a target="_blank" rel="noreferrer" className="btn-ghost text-xs"
              href={gcalLink({ title: `💅 ${svcName} · ${appt.client_name || ''}`, start: appt.start_at, end: appt.end_at, details: `Tel: ${appt.client_phone || ''}` })}>
              <CalendarPlus className="h-4 w-4" /> A mi calendario
            </a>
          </div>
        </div>
      )}
      <form onSubmit={save} className="space-y-4">
        {newClient ? (
          <div className="space-y-3 rounded-2xl border border-brand/20 bg-brand/5 p-4">
            <div className="flex items-center justify-between"><span className="label mb-0">Clienta nueva</span>
              <button type="button" onClick={() => setNewClient(null)} className="text-xs text-brand">elegir existente</button></div>
            <input className="input" placeholder="Nombre" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            <input className="input" placeholder="WhatsApp" inputMode="tel" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
          </div>
        ) : (
          <Field label="Clienta">
            <div className="flex gap-2">
              <select className="input" value={f.client_id} onChange={set('client_id')}>
                <option value="">— Sin clienta —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </select>
              <button type="button" onClick={() => setNewClient({ name: '', phone: '' })} className="btn-ghost shrink-0" title="Nueva clienta"><UserPlus className="h-4 w-4" /></button>
            </div>
          </Field>
        )}
        <Field label="Servicio">
          <select className="input" value={f.service_id} onChange={set('service_id')}>
            <option value="">— Elige —</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {money(s.price)}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Día"><input type="date" required className="input" value={f.date} onChange={set('date')} /></Field>
          <Field label="Hora"><input type="time" required step={900} className="input" value={f.time} onChange={set('time')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado">
            <select className="input" value={f.status} onChange={set('status')}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Cobro ($)"><input type="number" min="0" className="input" placeholder="Precio" value={f.price ?? ''} onChange={set('price')} /></Field>
        </div>
        <Field label="Notas"><textarea rows={2} className="input" value={f.notes || ''} onChange={set('notes')} placeholder="Diseño, largo, anticipo…" /></Field>
        {studio?.home_service ? (
          <label className="flex items-center justify-between rounded-2xl bg-ink-850 px-4 py-3 text-sm">A domicilio <Toggle checked={!!f.at_home} onChange={(v) => setF({ ...f, at_home: v ? 1 : 0 })} /></label>
        ) : null}
        <div className="flex gap-2 pt-2">
          {editing && <button type="button" onClick={remove} className="btn-danger"><Trash2 className="h-4 w-4" /></button>}
          <button disabled={busy} className="btn-primary flex-1 py-3">{busy ? <Spinner className="text-ink-950" /> : editing ? 'Guardar cambios' : 'Agendar'}</button>
        </div>
      </form>
    </Modal>
  );
}
