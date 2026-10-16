import { FormEvent, useEffect, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import { axios } from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';

export class additionaFeatureModel {
  feature_name = '';
  feature_type = '';
  is_active: 0 | 1 = 1;
}
export class entityModel {
  entity_id: string | null = null;
  name = '';
  short_desc = '';
  email = '';
  phone_num = '';
  address = '';
  expiry_date = '';
}

export default function Entity() {
  const { user } = useAuth();
  const canEdit = user?.is_superadmin === 1;
  const [rows, setRows] = useState<entityModel[]>([]);
  const [form, setForm] = useState<entityModel | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true);
    try { const r = await axios.get('/entity'); setRows(r.data.data); }
    catch { setError('Unable to load entities. Please try again.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setError('');
    try {
      const r = await axios[form.entity_id ? 'put' : 'post']('/entity', form);
      if (!r.data.success) throw new Error(r.data.message);
      setForm(null); await load();
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Unable to save entity.'); }
    finally { setSaving(false); }
  }
  const fields: { key: keyof entityModel; label: string; type?: string; required?: boolean; max: number }[] = [
    { key: 'name', label: 'Business name', required: true, max: 150 },
    { key: 'short_desc', label: 'Short description', max: 255 },
    { key: 'email', label: 'Contact email', type: 'email', required: true, max: 254 },
    { key: 'phone_num', label: 'Phone number', type: 'tel', max: 30 },
    { key: 'address', label: 'Business address', required: true, max: 1000 },
    { key: 'expiry_date', label: 'Access expiry', type: 'date', required: true, max: 10 },
  ];
  const filtered = rows.filter(row => [row.name, row.email, row.phone_num, row.address].some(v => String(v || '').toLowerCase().includes(search.toLowerCase())));
  return <>
    <div className="page-heading"><div><span className="eyebrow">WORKSPACE SETTINGS</span><h1>Entity master</h1><p>Manage your business identity and contact details.</p></div>
      {canEdit && <button className="primary-button" onClick={() => { setError(''); setForm(new entityModel()); }}>Add entity</button>}
    </div>
    {!form && error && <p role="alert" className="notice">{error} <button onClick={load}>Retry</button></p>}
    <section className="panel">
      <div className="inline-form"><input aria-label="Search entities" placeholder="Search business, email or phone" value={search} onChange={e => setSearch(e.target.value)} /><span className="notice">{filtered.length} entities</span></div>
      <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Business</th><th>Contact</th><th>Address</th><th>Access expiry</th>{canEdit && <th>Action</th>}</tr></thead>
        <tbody>{filtered.map(row => <tr key={row.entity_id}><td><strong>{row.name}</strong><div className="notice">{row.short_desc}</div></td><td>{row.email || '—'}<div className="notice">{row.phone_num || '—'}</div></td><td>{row.address || '—'}</td><td>{row.expiry_date || 'Not set'}</td>{canEdit && <td><button className="secondary-button" onClick={() => { setError(''); setForm(Object.fromEntries(Object.keys(new entityModel()).map(key => [key, (row as any)[key] ?? ''])) as unknown as entityModel); }}>Edit</button></td>}</tr>)}</tbody>
      </table></div>
      {loading ? <p role="status" className="notice">Loading entities…</p> : !filtered.length && <p className="notice">{search ? 'No entities match your search.' : 'No entities yet. Add your business to get started.'}</p>}
    </section>
    {form && <Modal heading={form.entity_id ? 'Edit entity' : 'Add entity'} onClose={() => !saving && setForm(null)} styleClass="entity-dialog"><form onSubmit={save}>
      <div className="entity-fields">{fields.map(field => <label key={field.key}>{field.label}{field.required && ' *'}<input type={field.type || 'text'} required={field.required} maxLength={field.max} value={form[field.key] ?? ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} /></label>)}</div>
      <p className="notice">Access expiry controls staff access to this business. Superadmins manage access.</p>
      {error && <p role="alert" className="notice">{error}</p>}
      <div className="inline-form" style={{ justifyContent: 'flex-end', marginTop: 24 }}><button type="button" className="secondary-button" disabled={saving} onClick={() => setForm(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save entity'}</button></div>
    </form></Modal>}
  </>;
}
