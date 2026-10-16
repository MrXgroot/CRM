import { useEffect, useState } from 'react';
import { axios, baseURL } from '../../utils/axios';
import { toastError, toastSuccess } from '../../utils/SweetAlert';
import Swal from 'sweetalert2';
import { exportToCsv } from '../../utils/exportCsv';
import { useAuth } from '../../contexts/AuthContext';

interface Customer {
  customer_id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  mobile: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: 'Active' | 'Inactive' | 'Lead' | 'VIP';
  total_revenue: number;
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

export default function CustomersPage() {
  const { currentEntity, currentBranch, branchAccess } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    mobile: '',
    industry: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    status: 'Active',
    assigned_to: '' as string | number,
    branch_id: '' as string | number,
    notes: ''
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;

      const res = await axios.get(`${baseURL}/crm/customers`, { params });
      if (res.data.success) {
        setCustomers(res.data.data || []);
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
    fetchCustomers();
    fetchUsers();
  }, [statusFilter, currentBranch, currentEntity]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      mobile: '',
      industry: 'Technology',
      address: '',
      city: '',
      state: '',
      country: 'India',
      status: 'Active',
      assigned_to: users[0]?.user_id || '',
      branch_id: currentBranch || branchAccess[0]?.branch_id || '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      company_name: customer.company_name || '',
      contact_name: customer.contact_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      industry: customer.industry || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'India',
      status: customer.status || 'Active',
      assigned_to: customer.assigned_to || '',
      branch_id: (customer as any).branch_id || currentBranch || '',
      notes: customer.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim() || !formData.contact_name.trim()) {
      toastError.fire({ title: 'Company Name and Contact Person are required' });
      return;
    }

    try {
      const payload = {
        ...formData,
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null
      };

      if (editingCustomer) {
        const res = await axios.put(`${baseURL}/crm/customers/${editingCustomer.customer_id}`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Customer updated successfully' });
          setIsModalOpen(false);
          fetchCustomers();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to update customer' });
        }
      } else {
        const res = await axios.post(`${baseURL}/crm/customers`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Customer added successfully' });
          setIsModalOpen(false);
          fetchCustomers();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to add customer' });
        }
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    }
  };

  const handleDelete = async (customer: Customer) => {
    const confirm = await Swal.fire({
      title: 'Delete Customer Account?',
      text: `Are you sure you want to delete "${customer.company_name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await axios.delete(`${baseURL}/crm/customers/${customer.customer_id}`);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Customer deleted successfully' });
          fetchCustomers();
        }
      } catch (err: any) {
        toastError.fire({ title: err.response?.data?.message || err.message });
      }
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalAccounts = customers.length;
  const activeCount = customers.filter(c => c.status === 'Active').length;
  const vipCount = customers.filter(c => c.status === 'VIP').length;
  const totalRealizedRevenue = customers.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VIP':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'Active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Inactive':
        return 'bg-zinc-700/40 text-slate-400 border-zinc-700';
      case 'Lead':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      default:
        return 'bg-zinc-800 text-slate-300 border-zinc-700';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
            <i className="fa-solid fa-address-book"></i>
            <span>Customer Directory</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Customer Accounts & Contacts</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Central repository of corporate accounts, authorized contacts, revenue volume, and communication history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCsv('crm_customers', filteredCustomers)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-sm font-medium border border-zinc-700/60 transition-all flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-file-csv text-emerald-400"></i>
            <span>Export Directory</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Accounts</span>
            <i className="fa-solid fa-building text-violet-400"></i>
          </div>
          <div className="text-2xl font-bold text-white">{totalAccounts}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Corporate records</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Clients</span>
            <i className="fa-solid fa-circle-check text-emerald-400"></i>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Generating recurring value</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>VIP Accounts</span>
            <i className="fa-solid fa-crown text-amber-400"></i>
          </div>
          <div className="text-2xl font-bold text-amber-400">{vipCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Key enterprise accounts</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Revenue</span>
            <i className="fa-solid fa-chart-pie text-purple-400"></i>
          </div>
          <div className="text-2xl font-bold text-white">₹{totalRealizedRevenue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lifetime closed deals</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md">
        <div className="relative w-full sm:w-96">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search accounts by company, contact, email, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Account Tier:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
          >
            <option value="All">All Tiers</option>
            <option value="Active">Active</option>
            <option value="VIP">⭐ VIP Enterprise</option>
            <option value="Lead">Lead Stage</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Company Name</th>
                <th className="py-3.5 px-4">Primary Contact</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4 text-center">Account Tier</th>
                <th className="py-3.5 px-4 text-right">Lifetime Revenue</th>
                <th className="py-3.5 px-4">Assigned Rep</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading customer directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customer accounts found. Click "Add Customer" to register an account.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.customer_id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{cust.company_name}</span>
                        {cust.status === 'VIP' && (
                          <i className="fa-solid fa-crown text-amber-400 text-xs" title="VIP Account"></i>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {cust.industry || 'General Industry'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{cust.contact_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        {cust.email && <span>{cust.email}</span>}
                        {cust.phone && <span>• {cust.phone}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {cust.city ? `${cust.city}, ${cust.state || cust.country}` : (cust.country || '—')}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(cust.status)}`}>
                        {cust.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
                      ₹{Number(cust.total_revenue || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {cust.assigned_user_name || 'Unassigned'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(cust)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(cust)}
                          title="Delete Customer"
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
                {editingCustomer ? 'Edit Customer Profile' : 'Register Customer Account'}
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
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Person Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Finance, Tech, Retail"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account Tier</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Active">Active</option>
                    <option value="VIP">⭐ VIP Account</option>
                    <option value="Lead">Lead Stage</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account Executive</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
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
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Select Branch --</option>
                    {branchAccess.map(b => (
                      <option key={b.branch_id} value={b.branch_id || ''}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Address</label>
                <input
                  type="text"
                  placeholder="Street address, building, suite..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes & History</label>
                <textarea
                  rows={2}
                  placeholder="Special client terms, contract preferences, or engagement notes..."
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
                  {editingCustomer ? 'Save Changes' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

