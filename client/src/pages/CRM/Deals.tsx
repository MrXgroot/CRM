import { useEffect, useState } from 'react';
import { axios, baseURL } from '../../utils/axios';
import { toastError, toastSuccess } from '../../utils/SweetAlert';
import Swal from 'sweetalert2';
import { exportToCsv } from '../../utils/exportCsv';
import { useAuth } from '../../contexts/AuthContext';

interface Deal {
  deal_id: number;
  deal_name: string;
  customer_id: number | null;
  company_name?: string;
  contact_name?: string;
  stage: 'Prospecting' | 'Qualification' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
  amount: number;
  probability: number;
  expected_close_date: string | null;
  status: 'Open' | 'Won' | 'Lost';
  approval_status: 'Not Required' | 'Pending' | 'Approved' | 'Rejected';
  approval_notes?: string;
  approved_by_name?: string;
  assigned_to: number | null;
  assigned_user_name?: string;
  branch_name?: string;
  notes: string;
  cr_on: string;
}

interface CustomerOption {
  customer_id: number;
  company_name: string;
}

interface UserOption {
  user_id: number;
  full_name: string;
}

export default function DealsPage() {
  const { currentEntity, currentBranch, branchAccess } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [formData, setFormData] = useState({
    deal_name: '',
    customer_id: '' as string | number,
    stage: 'Prospecting',
    amount: 0,
    expected_close_date: '',
    approval_status: 'Not Required',
    assigned_to: '' as string | number,
    branch_id: '' as string | number,
    notes: ''
  });

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (stageFilter !== 'All') params.stage = stageFilter;
      if (search) params.search = search;

      const res = await axios.get(`${baseURL}/crm/deals`, { params });
      if (res.data.success) {
        setDeals(res.data.data || []);
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${baseURL}/crm/customers`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      // ignore
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
    fetchDeals();
    fetchCustomers();
    fetchUsers();
  }, [stageFilter, currentBranch, currentEntity]);

  const openAddModal = () => {
    setEditingDeal(null);
    setFormData({
      deal_name: '',
      customer_id: customers[0]?.customer_id || '',
      stage: 'Prospecting',
      amount: 0,
      expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      approval_status: 'Not Required',
      assigned_to: users[0]?.user_id || '',
      branch_id: currentBranch || branchAccess[0]?.branch_id || '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      deal_name: deal.deal_name || '',
      customer_id: deal.customer_id || '',
      stage: deal.stage || 'Prospecting',
      amount: deal.amount || 0,
      expected_close_date: deal.expected_close_date ? deal.expected_close_date.slice(0, 10) : '',
      approval_status: deal.approval_status || 'Not Required',
      assigned_to: deal.assigned_to || '',
      branch_id: (deal as any).branch_id || currentBranch || '',
      notes: deal.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deal_name.trim()) {
      toastError.fire({ title: 'Deal name is required' });
      return;
    }

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount) || 0,
        customer_id: formData.customer_id ? Number(formData.customer_id) : null,
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null
      };

      if (editingDeal) {
        const res = await axios.put(`${baseURL}/crm/deals/${editingDeal.deal_id}`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Deal updated successfully' });
          setIsModalOpen(false);
          fetchDeals();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to update deal' });
        }
      } else {
        const res = await axios.post(`${baseURL}/crm/deals`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Deal created successfully' });
          setIsModalOpen(false);
          fetchDeals();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to create deal' });
        }
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    }
  };

  const handleStageChange = async (deal: Deal, newStage: string) => {
    try {
      const res = await axios.post(`${baseURL}/crm/deals/${deal.deal_id}/stage`, { stage: newStage });
      if (res.data.success) {
        toastSuccess.fire({ title: `Deal moved to ${newStage}` });
        fetchDeals();
      } else {
        toastError.fire({ title: res.data.message || 'Failed to update stage' });
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    }
  };

  const handleApprovalTrigger = async (deal: Deal) => {
    const { value: decision } = await Swal.fire({
      title: 'Review Deal Approval',
      text: `Deal: "${deal.deal_name}" (Amount: ₹${deal.amount.toLocaleString()})`,
      input: 'radio',
      inputOptions: {
        Approved: '✅ Approve Contract / Discount',
        Rejected: '❌ Reject Proposal',
        Pending: '⏳ Set to Pending Review'
      },
      inputValue: deal.approval_status === 'Approved' ? 'Approved' : 'Pending',
      showCancelButton: true,
      confirmButtonText: 'Confirm Decision',
      confirmButtonColor: '#2563eb'
    });

    if (decision) {
      const { value: notes } = await Swal.fire({
        title: 'Approval Notes (Optional)',
        input: 'text',
        inputPlaceholder: 'Reason, terms, or conditions...',
        showCancelButton: true
      });

      try {
        const res = await axios.post(`${baseURL}/crm/deals/${deal.deal_id}/approval`, {
          approval_status: decision,
          notes: notes || ''
        });
        if (res.data.success) {
          toastSuccess.fire({ title: `Deal status updated to ${decision}` });
          fetchDeals();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to update approval' });
        }
      } catch (err: any) {
        toastError.fire({ title: err.response?.data?.message || err.message });
      }
    }
  };

  const handleDelete = async (deal: Deal) => {
    const confirm = await Swal.fire({
      title: 'Delete Deal Opportunity?',
      text: `Are you sure you want to delete "${deal.deal_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await axios.delete(`${baseURL}/crm/deals/${deal.deal_id}`);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Deal deleted successfully' });
          fetchDeals();
        }
      } catch (err: any) {
        toastError.fire({ title: err.response?.data?.message || err.message });
      }
    }
  };

  const filteredDeals = deals.filter(d =>
    d.deal_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.contact_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalDealsCount = deals.length;
  const wonDealsCount = deals.filter(d => d.stage === 'Won').length;
  const openDealsCount = deals.filter(d => d.status === 'Open').length;
  const openPipelineValue = deals
    .filter(d => d.status === 'Open')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const wonTotalValue = deals
    .filter(d => d.stage === 'Won')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'Prospecting':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'Qualification':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Proposal Sent':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Negotiation':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Won':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Lost':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-700 text-slate-300 border-zinc-600';
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Pending':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Rejected':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
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
            <i className="fa-solid fa-handshake"></i>
            <span>Revenue Pipeline</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Deals & Opportunities</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track deal stages, contractual negotiations, contract approvals, and projected closing probabilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCsv('crm_deals', filteredDeals)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-sm font-medium border border-zinc-700/60 transition-all flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-file-csv text-emerald-400"></i>
            <span>Export Deals</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Create Deal</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Deals</span>
            <i className="fa-solid fa-folder-open text-violet-400"></i>
          </div>
          <div className="text-2xl font-bold text-white">{totalDealsCount}</div>
          <div className="text-[11px] text-violet-400 mt-0.5">{openDealsCount} active in pipeline</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Open Pipeline</span>
            <i className="fa-solid fa-arrow-trend-up text-amber-400"></i>
          </div>
          <div className="text-2xl font-bold text-amber-400">₹{openPipelineValue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Weighted opportunity value</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Won Deals</span>
            <i className="fa-solid fa-trophy text-emerald-400"></i>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{wonDealsCount}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Closed & signed contracts</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Won Revenue</span>
            <i className="fa-solid fa-sack-dollar text-purple-400"></i>
          </div>
          <div className="text-2xl font-bold text-white">₹{wonTotalValue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Generated business</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md">
        <div className="relative w-full md:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search deals by title, account, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Pipeline Stage:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
          >
            <option value="All">All Stages</option>
            <option value="Prospecting">Prospecting (20%)</option>
            <option value="Qualification">Qualification (40%)</option>
            <option value="Proposal Sent">Proposal Sent (60%)</option>
            <option value="Negotiation">Negotiation (80%)</option>
            <option value="Won">🏆 Won (100%)</option>
            <option value="Lost">Lost (0%)</option>
          </select>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Deal Name</th>
                <th className="py-3.5 px-4">Account / Client</th>
                <th className="py-3.5 px-4 text-right">Deal Amount</th>
                <th className="py-3.5 px-4 text-center">Stage & Probability</th>
                <th className="py-3.5 px-4 text-center">Approval Workflow</th>
                <th className="py-3.5 px-4">Expected Close</th>
                <th className="py-3.5 px-4">Representative</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading pipeline deals...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No deals found. Click "Create Deal" to start your pipeline.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr key={deal.deal_id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {deal.deal_name}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{deal.company_name || 'Direct / Prospect'}</div>
                      {deal.contact_name && <div className="text-[11px] text-slate-400">{deal.contact_name}</div>}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-base">
                      ₹{Number(deal.amount || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <select
                          value={deal.stage}
                          onChange={(e) => handleStageChange(deal, e.target.value)}
                          className={`text-xs font-semibold rounded-lg px-2 py-1 border focus:outline-none cursor-pointer ${getStageBadge(deal.stage)}`}
                        >
                          <option value="Prospecting">Prospecting (20%)</option>
                          <option value="Qualification">Qualification (40%)</option>
                          <option value="Proposal Sent">Proposal Sent (60%)</option>
                          <option value="Negotiation">Negotiation (80%)</option>
                          <option value="Won">🏆 Won (100%)</option>
                          <option value="Lost">Lost (0%)</option>
                        </select>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleApprovalTrigger(deal)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors hover:brightness-110 ${getApprovalBadge(deal.approval_status)}`}
                        title="Click to trigger approval decision"
                      >
                        <span>{deal.approval_status}</span>
                        <i className="fa-solid fa-angle-down text-[10px]"></i>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {deal.assigned_user_name || 'Unassigned'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(deal)}
                          title="Edit Deal"
                          className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(deal)}
                          title="Delete Deal"
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
                {editingDeal ? 'Edit Deal Parameters' : 'Create Pipeline Deal'}
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
                    Deal Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise CRM License"
                    value={formData.deal_name}
                    onChange={(e) => setFormData({ ...formData, deal_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Associated Account</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Direct / Unlinked --</option>
                    {customers.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deal Amount (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pipeline Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Prospecting">Prospecting (20%)</option>
                    <option value="Qualification">Qualification (40%)</option>
                    <option value="Proposal Sent">Proposal Sent (60%)</option>
                    <option value="Negotiation">Negotiation (80%)</option>
                    <option value="Won">🏆 Won (100%)</option>
                    <option value="Lost">Lost (0%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Approval Trigger</label>
                  <select
                    value={formData.approval_status}
                    onChange={(e) => setFormData({ ...formData, approval_status: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Not Required">Not Required</option>
                    <option value="Pending">Pending Manager Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Sales Rep</label>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deal Details & Scope</label>
                <textarea
                  rows={3}
                  placeholder="Commercial terms, contract deliverables, or specific client requests..."
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
                  {editingDeal ? 'Save Changes' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

