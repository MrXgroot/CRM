import { useEffect, useState } from 'react';
import { axios, baseURL } from '../../utils/axios';
import { toastError, toastSuccess } from '../../utils/SweetAlert';
import Swal from 'sweetalert2';
import { exportToCsv } from '../../utils/exportCsv';
import { useAuth } from '../../contexts/AuthContext';

interface Lead {
  lead_id: number;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  lead_source: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Qualified' | 'Disqualified' | 'Converted';
  rating: 'Hot' | 'Warm' | 'Cold';
  estimated_value: number;
  assigned_to: number | null;
  assigned_user_name?: string;
  branch_name?: string;
  notes: string;
  cr_on: string;
}

interface UserOption {
  user_id: number;
  full_name: string;
}

export default function LeadsPage() {
  const { currentEntity, currentBranch, branchAccess } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    email: '',
    phone: '',
    lead_source: 'Website',
    status: 'New',
    rating: 'Warm',
    estimated_value: 0,
    assigned_to: '' as string | number,
    branch_id: '' as string | number,
    notes: ''
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;

      const res = await axios.get(`${baseURL}/crm/leads`, { params });
      if (res.data.success) {
        setLeads(res.data.data || []);
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${baseURL}/user`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, [statusFilter, currentBranch, currentEntity]);

  const openAddModal = () => {
    setEditingLead(null);
    setFormData({
      first_name: '',
      last_name: '',
      company: '',
      email: '',
      phone: '',
      lead_source: 'Website',
      status: 'New',
      rating: 'Warm',
      estimated_value: 0,
      assigned_to: users[0]?.user_id || '',
      branch_id: currentBranch || branchAccess[0]?.branch_id || '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      lead_source: lead.lead_source || 'Website',
      status: lead.status || 'New',
      rating: lead.rating || 'Warm',
      estimated_value: lead.estimated_value || 0,
      assigned_to: lead.assigned_to || '',
      branch_id: (lead as any).branch_id || currentBranch || '',
      notes: lead.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toastError.fire({ title: 'First name is required' });
      return;
    }

    try {
      const payload = {
        ...formData,
        estimated_value: Number(formData.estimated_value) || 0,
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null
      };

      if (editingLead) {
        const res = await axios.put(`${baseURL}/crm/leads/${editingLead.lead_id}`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Lead updated successfully' });
          setIsModalOpen(false);
          fetchLeads();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to update lead' });
        }
      } else {
        const res = await axios.post(`${baseURL}/crm/leads`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Lead created successfully' });
          setIsModalOpen(false);
          fetchLeads();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to create lead' });
        }
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    }
  };

  const handleDelete = async (lead: Lead) => {
    const confirm = await Swal.fire({
      title: 'Delete Lead?',
      text: `Are you sure you want to delete lead "${lead.first_name} ${lead.last_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await axios.delete(`${baseURL}/crm/leads/${lead.lead_id}`);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Lead deleted' });
          fetchLeads();
        }
      } catch (err: any) {
        toastError.fire({ title: err.response?.data?.message || err.message });
      }
    }
  };

  const handleConvertLead = async (lead: Lead) => {
    const confirm = await Swal.fire({
      title: 'Convert Lead to Customer?',
      text: `This will automatically create a new Customer account and open Deal opportunity for "${lead.first_name} ${lead.last_name}".`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Convert Now',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancel'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await axios.post(`${baseURL}/crm/leads/${lead.lead_id}/convert`, {});
        if (res.data.success) {
          toastSuccess.fire({ title: 'Lead successfully converted to Customer & Deal!' });
          fetchLeads();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to convert lead' });
        }
      } catch (err: any) {
        toastError.fire({ title: err.response?.data?.message || err.message });
      }
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (l.company?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (l.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (l.phone || '').includes(search);

    const matchesRating = ratingFilter === 'All' || l.rating === ratingFilter;
    return matchesSearch && matchesRating;
  });

  // KPI Calculations
  const totalLeadsCount = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'New').length;
  const qualifiedCount = leads.filter(l => l.status === 'Qualified').length;
  const convertedCount = leads.filter(l => l.status === 'Converted').length;
  const totalPipelineVal = leads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'Contacted':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'In Progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Qualified':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Converted':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/20';
      case 'Disqualified':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-700/40 text-slate-300 border-zinc-700';
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'Hot':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Warm':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Cold':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      default:
        return 'text-slate-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
            <i className="fa-solid fa-bullseye"></i>
            <span>CRM Core</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Leads & Prospects</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Capture, qualify, nurture, and seamlessly convert business opportunities into paying customers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCsv('crm_leads', filteredLeads)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-sm font-medium border border-zinc-700/60 transition-all flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-file-csv text-emerald-400"></i>
            <span>Export Leads</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Leads</span>
            <i className="fa-solid fa-users text-violet-400"></i>
          </div>
          <div className="text-2xl font-bold text-white">{totalLeadsCount}</div>
          <div className="text-[11px] text-violet-400 mt-0.5">In active database</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>New Leads</span>
            <i className="fa-solid fa-bolt text-amber-400"></i>
          </div>
          <div className="text-2xl font-bold text-amber-400">{newLeadsCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Require initial contact</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Qualified / Won</span>
            <i className="fa-solid fa-check-double text-emerald-400"></i>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{qualifiedCount + convertedCount}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5">{convertedCount} converted to clients</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pipeline Value</span>
            <i className="fa-solid fa-coins text-purple-400"></i>
          </div>
          <div className="text-2xl font-bold text-white">₹{totalPipelineVal.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Estimated opportunity</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md">
        <div className="relative w-full md:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search leads by name, company, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="In Progress">In Progress</option>
              <option value="Qualified">Qualified</option>
              <option value="Converted">Converted</option>
              <option value="Disqualified">Disqualified</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Rating:</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
            >
              <option value="All">All Ratings</option>
              <option value="Hot">🔥 Hot</option>
              <option value="Warm">⚡ Warm</option>
              <option value="Cold">❄️ Cold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Lead Name</th>
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Rating</th>
                <th className="py-3.5 px-4 text-right">Est. Value</th>
                <th className="py-3.5 px-4">Assigned Rep</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading leads data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No leads found. Click "Add New Lead" to create your first prospect.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.lead_id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Source: {lead.lead_source || 'Website'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-200">
                      {lead.company || 'Individual'}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-300">{lead.email || '—'}</div>
                      <div className="text-xs text-slate-400">{lead.phone || '—'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getRatingBadge(lead.rating)}`}>
                        {lead.rating}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
                      ₹{Number(lead.estimated_value || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {lead.assigned_user_name || 'Unassigned'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== 'Converted' && (
                          <button
                            onClick={() => handleConvertLead(lead)}
                            title="Convert to Customer & Deal"
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i>
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(lead)}
                          title="Edit lead"
                          className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(lead)}
                          title="Delete lead"
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <h3 className="text-lg font-bold text-white">
                {editingLead ? 'Edit Lead Opportunity' : 'Add New Lead Prospect'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lead Source</label>
                  <select
                    value={formData.lead_source}
                    onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Website">Website Inbound</option>
                    <option value="Referral">Client Referral</option>
                    <option value="Cold Call">Cold Outreach</option>
                    <option value="LinkedIn">LinkedIn / Social</option>
                    <option value="Event">Conference / Event</option>
                    <option value="Partner">Channel Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Disqualified">Disqualified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Rating</label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Hot">🔥 Hot</option>
                    <option value="Warm">⚡ Warm</option>
                    <option value="Cold">❄️ Cold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Est. Deal Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assign to Representative</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {users.map(u => (
                      <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Branch</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Select Branch --</option>
                    {branchAccess.map(b => (
                      <option key={b.branch_id} value={b.branch_id || ''}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes & Next Action</label>
                <textarea
                  rows={3}
                  placeholder="Interaction notes, requirements, and scheduled next follow-up details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-violet-500/30"
                >
                  {editingLead ? 'Save Changes' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

