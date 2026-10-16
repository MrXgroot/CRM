import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { Download, RefreshCw, TrendingUp } from 'lucide-react';
import { axios } from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCsv } from '../../utils/exportCsv';
import './Reports.css';

type Count = { label: string; count: number };
type Deal = Count & { amount: number };
type Month = { month: string; customers: number; leads: number; deals: number; deal_value: number };
type Report = {
  from: string; to: string; tickets_entity_wide: boolean;
  totals: { customers: number; leads: number; converted_leads: number; deals: number; deal_value: number; won_value: number; overdue_activities: number };
  monthly: Month[]; customers: Count[]; leads: Count[]; sources: Count[];
  deals: Deal[]; activities: Count[]; tickets: Count[]; ticket_monthly: { month: string; count: number }[];
};
const today = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;
const number = (value: number) => Number(value || 0).toLocaleString('en-IN');
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const colors = ['#ae8dff', '#6d55aa', '#d5b5ff', '#7863e3', '#5f517b', '#e0d2ff'];

function Breakdown({ title, items, currency = false }: { title: string; items: Count[]; currency?: boolean }) {
  const maximum = Math.max(...items.map(item => Number(currency ? (item as Deal).amount : item.count)), 1);
  return <section className="panel report-panel">
    <h2>{title}</h2>
    {items.length ? <div className="report-breakdown">{items.map((item, index) => {
      const value = Number(currency ? (item as Deal).amount : item.count);
      return <div className="report-bar-row" key={item.label}>
        <div className="report-bar-meta"><span>{item.label}</span><strong>{currency ? money(value) : number(value)} <small>({number(item.count)})</small></strong></div>
        <div className="report-track"><div style={{ width: `${100 * value / maximum}%`, background: colors[index % colors.length] }} /></div>
      </div>;
    })}</div> : <p className="empty-state">No records in this period.</p>}
  </section>;
}

export default function ReportsPage() {
  const { currentEntity, currentBranch } = useAuth();
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState({ from: yearStart(), to: today() });
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    axios.get('/crm/reports', { params: period }).then(r => {
      if (!cancelled) setData(r.data.data);
    }).catch(e => {
      if (!cancelled) { setData(null); setError(e.response?.data?.message || 'Could not load reports. Please try again.'); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, currentEntity, currentBranch, reload]);

  const chartBase = { chart: { toolbar: { show: false }, background: 'transparent' },
    theme: { mode: 'dark' as const }, colors, dataLabels: { enabled: false },
    grid: { borderColor: '#30263f' }, tooltip: { theme: 'dark' as const },
    xaxis: { labels: { style: { colors: '#a59ab6' } }, axisBorder: { color: '#30263f' }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#a59ab6' } } }, legend: { labels: { colors: '#d7cce4' } } };
  const chart = data?.monthly || [];
  function download() {
    if (!data) return;
    const rows = [
      ...data.monthly.map(m => ({ section: 'Monthly', category: m.month, count: m.customers, leads: m.leads, deals: m.deals, amount: m.deal_value })),
      ...(['customers', 'leads', 'sources', 'deals', 'activities', 'tickets'] as const).flatMap(section =>
        data[section].map(row => ({ section, category: row.label, count: row.count, leads: '', deals: '', amount: 'amount' in row ? row.amount : '' }))),
      ...data.ticket_monthly.map(m => ({ section: 'Monthly support (entity-wide)', category: m.month, count: m.count, leads: '', deals: '', amount: '' })),
    ];
    exportToCsv(`matrika_report_${data.from}_${data.to}`, rows);
  }
  return <div className="reports-page">
    <div className="page-heading reports-heading"><div><span className="eyebrow">CRM INTELLIGENCE</span><h1>Reports & insights</h1><p>Real customer, sales, activity and support data in one view.</p></div><button className="secondary-button" onClick={download} disabled={!data || loading}><Download size={17} /> Export CSV</button></div>
    <form className="panel report-filters" onSubmit={e => { e.preventDefault(); if (from <= to) setPeriod({ from, to }); }}>
      <label>From <input type="date" required value={from} max={to} onChange={e => setFrom(e.target.value)} /></label>
      <label>To <input type="date" required value={to} min={from} max={today()} onChange={e => setTo(e.target.value)} /></label>
      <button type="submit" className="primary-button">Apply dates</button><button type="button" className="secondary-button" onClick={() => setReload(v => v + 1)} aria-label="Refresh report"><RefreshCw size={17} /></button>
      <span className="report-hint">Uses the selected entity and branch from the workspace bar.</span>
    </form>
    {error && <p className="error-box" role="alert">{error}</p>}
    {loading && <p className="loading-state" role="status">Loading report…</p>}
    {!loading && data && <>
      <p className="report-period">Created {data.from} through {data.to} · Current statuses and stages</p>
      <div className="report-kpis">
        {([['Customers', data.totals.customers], ['Leads', data.totals.leads], ['Converted leads', data.totals.converted_leads], ['Deals', data.totals.deals], ['Deal value', money(data.totals.deal_value)], ['Won deal value', money(data.totals.won_value)], ['Overdue activities', data.totals.overdue_activities]] as const).map(([label, value]) => <div className="panel report-kpi" key={label}><span>{label}</span><strong>{typeof value === 'number' ? number(value) : value}</strong></div>)}
      </div>
      <div className="report-grid">
        <section className="panel report-panel report-wide"><div className="report-chart-title"><TrendingUp size={19} /><h2>Monthly CRM growth</h2></div>{chart.length ? <Chart type="bar" height={290} options={{ ...chartBase, plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } }, xaxis: { ...chartBase.xaxis, categories: chart.map(m => m.month) } }} series={[{ name: 'Customers', data: chart.map(m => Number(m.customers)) }, { name: 'Leads', data: chart.map(m => Number(m.leads)) }, { name: 'Deals', data: chart.map(m => Number(m.deals)) }]} /> : <p className="empty-state">No CRM records in this period.</p>}</section>
        <section className="panel report-panel"><h2>Pipeline mix</h2>{data.deals.length ? <Chart type="donut" height={290} options={{ ...chartBase, labels: data.deals.map(d => d.label), legend: { ...chartBase.legend, position: 'bottom' }, stroke: { colors: ['#17131f'] } }} series={data.deals.map(d => Number(d.count))} /> : <p className="empty-state">No deals in this period.</p>}</section>
        <Breakdown title="Deal value by stage" items={data.deals} currency />
        <Breakdown title="Lead sources" items={data.sources} />
        <Breakdown title="Lead status" items={data.leads} />
        <Breakdown title="Customer status" items={data.customers} />
        <Breakdown title="Activity status" items={data.activities} />
        <Breakdown title="Support tickets" items={data.tickets} />
        <section className="panel report-panel"><h2>Monthly support requests</h2>{data.ticket_monthly.length ? <Chart type="area" height={225} options={{ ...chartBase, xaxis: { ...chartBase.xaxis, categories: data.ticket_monthly.map(t => t.month) }, stroke: { curve: 'smooth', width: 3 } }} series={[{ name: 'Requests', data: data.ticket_monthly.map(t => Number(t.count)) }]} /> : <p className="empty-state">No support requests in this period.</p>}</section>
      </div>
      <p className="notice report-note">Metrics use record creation dates and current statuses. Deal value is the sum of amounts for deals created in this period; won value includes only those currently at Won. Support tickets cover the selected entity across all branches because tickets do not have a branch field. An empty chart means no matching records.</p>
    </>}
  </div>;
}
