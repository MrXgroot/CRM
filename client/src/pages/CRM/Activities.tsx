import { useEffect, useState } from 'react';
import { axios, baseURL } from '../../utils/axios';
import { toastError, toastSuccess } from '../../utils/SweetAlert';
import Swal from 'sweetalert2';
import { exportToCsv } from '../../utils/exportCsv';
import { useAuth } from '../../contexts/AuthContext';

interface Activity {
  activity_id: number;
  title: string;
  activity_type: 'Call' | 'Meeting' | 'Task' | 'Email' | 'Follow-up';
  related_to_type: 'Lead' | 'Customer' | 'Deal';
  related_to_id: number | null;
  due_date: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  notes: string;
  assigned_to: number | null;
  assigned_user_name?: string;
  branch_name?: string;
  cr_on: string;
}

interface UserOption {
  user_id: number;
  full_name: string;
}

export default function ActivitiesPage() {
  const { currentEntity, currentBranch, branchAccess } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    activity_type: 'Task',
    related_to_type: 'Lead',
    due_date: new Date().toISOString().slice(0, 16),
    priority: 'Medium',
    status: 'Pending',
    assigned_to: '' as string | number,
    branch_id: '' as string | number,
    notes: ''
  });

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await axios.get(`${baseURL}/crm/activities`, { params });
      if (res.data.success) {
        setActivities(res.data.data || []);
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
    fetchActivities();
    fetchUsers();
  }, [statusFilter, currentBranch, currentEntity]);

  const openAddModal = () => {
    setEditingActivity(null);
    setFormData({
      title: '',
      activity_type: 'Call',
      related_to_type: 'Lead',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      priority: 'Medium',
      status: 'Pending',
      assigned_to: users[0]?.user_id || '',
      branch_id: currentBranch || branchAccess[0]?.branch_id || '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (act: Activity) => {
    setEditingActivity(act);
    setFormData({
      title: act.title || '',
      activity_type: act.activity_type || 'Task',
      related_to_type: act.related_to_type || 'Lead',
      due_date: act.due_date ? act.due_date.slice(0, 16) : '',
      priority: act.priority || 'Medium',
      status: act.status || 'Pending',
      assigned_to: act.assigned_to || '',
      branch_id: (act as any).branch_id || currentBranch || '',
      notes: act.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toastError.fire({ title: 'Title is required' });
      return;
    }

    try {
      const payload = {
        ...formData,
        due_date: formData.due_date ? formData.due_date : null,
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null
      };

      if (editingActivity) {
        const res = await axios.put(`${baseURL}/crm/activities/${editingActivity.activity_id}`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Activity updated' });
          setIsModalOpen(false);
          fetchActivities();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to update' });
        }
      } else {
        const res = await axios.post(`${baseURL}/crm/activities`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Activity scheduled' });
          setIsModalOpen(false);
          fetchActivities();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to add' });
        }
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    }
  };

  const handleStatusTrigger = async (act: Activity, newStatus: string) => {
    try {
      const res = await axios.post(`${baseURL}/crm/activities/${act.activity_id}/status`, { status: newStatus });
      if (res.data.success) {
        toastSuccess.fire({ title: `Activity marked as ${newStatus}` });
        fetchActivities();
      } else {
        toastError.fire({ title: res.data.message || 'Failed to update' });
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    }
  };

  const handleDelete = async (act: Activity) => {
    const confirm = await Swal.fire({
      title: 'Delete Activity?',
      text: `Are you sure you want to remove "${act.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await axios.delete(`${baseURL}/crm/activities/${act.activity_id}`);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Activity deleted' });
          fetchActivities();
        }
      } catch (err: any) {
        toastError.fire({ title: err.response?.data?.message || err.message });
      }
    }
  };

  const filteredActivities = activities.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.notes || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalActivitiesCount = activities.length;
  const pendingCount = activities.filter(a => a.status === 'Pending').length;
  const completedCount = activities.filter(a => a.status === 'Completed').length;
  const urgentCount = activities.filter(a => a.priority === 'Urgent' && a.status !== 'Completed').length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Call': return 'fa-solid fa-phone text-violet-400';
      case 'Meeting': return 'fa-solid fa-video text-purple-400';
      case 'Email': return 'fa-solid fa-envelope text-amber-400';
      case 'Follow-up': return 'fa-solid fa-calendar-check text-purple-400';
      default: return 'fa-solid fa-list-check text-emerald-400';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'High': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Medium': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      default: return 'text-slate-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
            <i className="fa-solid fa-calendar-check"></i>
            <span>Task Coordination</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Activities & Follow-ups</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Coordinate sales calls, client meetings, task milestones, and automated follow-up sequences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCsv('crm_activities', filteredActivities)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-sm font-medium border border-zinc-700/60 transition-all flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-file-csv text-emerald-400"></i>
            <span>Export Tasks</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Schedule Activity</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Tasks</span>
            <i className="fa-solid fa-list-check text-violet-400"></i>
          </div>
          <div className="text-2xl font-bold text-white">{totalActivitiesCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All tracked events</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pending Follow-ups</span>
            <i className="fa-solid fa-clock text-amber-400"></i>
          </div>
          <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Require execution</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Completed</span>
            <i className="fa-solid fa-circle-check text-emerald-400"></i>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Executed milestones</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Urgent Priorities</span>
            <i className="fa-solid fa-fire text-rose-400"></i>
          </div>
          <div className="text-2xl font-bold text-rose-400">{urgentCount}</div>
          <div className="text-[11px] text-rose-400 mt-0.5">High attention tasks</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md">
        <div className="relative w-full sm:w-96">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search activities and follow-up notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
          >
            <option value="All">All Activities</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Activity Title</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-center">Priority</th>
                <th className="py-3.5 px-4 text-center">Status Trigger</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading activities...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No scheduled activities found. Click "Schedule Activity" to add one.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => (
                  <tr key={act.activity_id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <i className={getTypeIcon(act.activity_type)}></i>
                        <span>{act.title}</span>
                      </div>
                      {act.notes && (
                        <div className="text-xs text-slate-400 truncate max-w-sm mt-0.5">{act.notes}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      <span className="bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700">
                        {act.activity_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                      {act.due_date ? new Date(act.due_date).toLocaleString() : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getPriorityBadge(act.priority)}`}>
                        {act.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <select
                          value={act.status}
                          onChange={(e) => handleStatusTrigger(act, e.target.value)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border focus:outline-none cursor-pointer ${
                            act.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : act.status === 'In Progress'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">✓ Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {act.assigned_user_name || 'Unassigned'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(act)}
                          title="Edit Activity"
                          className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(act)}
                          title="Delete Activity"
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <h3 className="text-lg font-bold text-white">
                {editingActivity ? 'Edit Activity / Task' : 'Schedule New Activity'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Activity Subject / Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Product Demo Call, Contract Follow-up"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Activity Type</label>
                  <select
                    value={formData.activity_type}
                    onChange={(e) => setFormData({ ...formData, activity_type: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Call">📞 Phone Call</option>
                    <option value="Meeting">📹 Video / In-person Meeting</option>
                    <option value="Task">📋 Task / Action Item</option>
                    <option value="Email">✉️ Email Outreach</option>
                    <option value="Follow-up">🔔 Scheduled Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">🔥 Urgent Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Executive</label>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes & Discussion Summary</label>
                <textarea
                  rows={3}
                  placeholder="Call notes, agenda items, or client feedback..."
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
                  {editingActivity ? 'Save Changes' : 'Schedule Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

