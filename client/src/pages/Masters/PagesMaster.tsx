import { useEffect, useState } from 'react';
import { axios, baseURL } from '../../utils/axios';
import { toastError, toastSuccess } from '../../utils/SweetAlert';
import Swal from 'sweetalert2';
import { exportToCsv } from '../../utils/exportCsv';

interface PageItem {
  page_id: number;
  page_name: string;
  name: string;
  description: string | null;
  superadmin_only: number;
  access_for_all: number;
  offline_enabled: number;
  is_default_home: number;
}

export default function PagesMaster() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageItem | null>(null);

  const [formData, setFormData] = useState({
    page_name: '',
    name: '',
    description: '',
    superadmin_only: 0,
    access_for_all: 0,
    offline_enabled: 0
  });

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${baseURL}/page`);
      if (res.data.success) {
        setPages(res.data.data || []);
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const openAddModal = () => {
    setEditingPage(null);
    setFormData({
      page_name: '',
      name: '',
      description: '',
      superadmin_only: 0,
      access_for_all: 0,
      offline_enabled: 0
    });
    setIsModalOpen(true);
  };

  const openEditModal = (page: PageItem) => {
    setEditingPage(page);
    setFormData({
      page_name: page.page_name,
      name: page.name || '',
      description: page.description || '',
      superadmin_only: page.superadmin_only || 0,
      access_for_all: page.access_for_all || 0,
      offline_enabled: page.offline_enabled || 0
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.page_name.trim() || !formData.name.trim()) {
      toastError.fire({ title: 'Route URL and Name are required' });
      return;
    }

    try {
      if (editingPage) {
        const payload = {
          page_id: editingPage.page_id,
          ...formData
        };
        const res = await axios.put(`${baseURL}/page`, payload);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Page updated successfully' });
          setIsModalOpen(false);
          fetchPages();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to update page' });
        }
      } else {
        const res = await axios.post(`${baseURL}/page`, formData);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Page registered successfully' });
          setIsModalOpen(false);
          fetchPages();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to add page' });
        }
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    }
  };

  const handleDelete = async (page: PageItem) => {
    const confirm = await Swal.fire({
      title: 'Delete Page?',
      text: `Are you sure you want to delete "${page.name}" (${page.page_name})? This will also remove role permissions for it.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await axios.delete(`${baseURL}/page/${page.page_id}`);
        if (res.data.success) {
          toastSuccess.fire({ title: 'Page deleted successfully' });
          fetchPages();
        } else {
          toastError.fire({ title: res.data.message || 'Failed to delete' });
        }
      } catch (err: any) {
        toastError.fire({ title: err.response?.data?.message || err.message });
      }
    }
  };

  const handleSetDefaultHome = async (page: PageItem) => {
    try {
      const res = await axios.post(`${baseURL}/page/set-default-home`, { page_name: page.page_name });
      if (res.data.success) {
        toastSuccess.fire({ title: `Default home set to ${page.name}` });
        fetchPages();
      }
    } catch (err: any) {
      toastError.fire({ title: err.response?.data?.message || err.message });
    }
  };

  const filteredPages = pages.filter(p =>
    (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.page_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.description?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
            <i className="fa-solid fa-copy"></i>
            <span>System Master</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Pages & Navigation Master</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Dynamically register, configure, and manage system views, routing paths, and role accessibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCsv('pages_master', filteredPages)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-sm font-medium border border-zinc-700/60 transition-all flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-file-csv text-emerald-400"></i>
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Register New Page</span>
          </button>
        </div>
      </div>

      {/* Search & Counter Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md">
        <div className="relative w-full sm:w-96">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search pages by name, route URL, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-white font-bold">{filteredPages.length}</span> of {pages.length} system pages
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">#ID</th>
                <th className="py-3.5 px-4">Display Name</th>
                <th className="py-3.5 px-4">Route Path (URL)</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-center">Superadmin Only</th>
                <th className="py-3.5 px-4 text-center">Public / All Access</th>
                <th className="py-3.5 px-4 text-center">Default Home</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading registered pages...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No pages matched your search query.
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.page_id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400 font-bold">
                      {page.page_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {page.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-violet-400">
                      {page.page_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate text-xs">
                      {page.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {page.superadmin_only === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">No</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {page.access_for_all === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          All Users
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">RBAC Restricted</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {page.is_default_home === 1 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          <i className="fa-solid fa-home text-[10px]"></i> Home
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultHome(page)}
                          title="Set as Default Home Page"
                          className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
                        >
                          Make Home
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(page)}
                          title="Edit page"
                          className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(page)}
                          title="Delete page"
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-trash-can"></i>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <h3 className="text-lg font-bold text-white">
                {editingPage ? 'Edit Page Details' : 'Register New Page'}
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
                  Route URL Path <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. /crm/leads"
                  value={formData.page_name}
                  onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Must start with a leading slash `/`</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CRM Leads Management"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short summary of what this page module handles"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-800 bg-zinc-800/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.superadmin_only === 1}
                    onChange={(e) => setFormData({ ...formData, superadmin_only: e.target.checked ? 1 : 0 })}
                    className="rounded bg-zinc-900 border-zinc-700 text-violet-600 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Superadmin Only</span>
                    <span className="text-[10px] text-slate-400">Hidden from other roles</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-800 bg-zinc-800/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.access_for_all === 1}
                    onChange={(e) => setFormData({ ...formData, access_for_all: e.target.checked ? 1 : 0 })}
                    className="rounded bg-zinc-900 border-zinc-700 text-violet-600 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Access For All</span>
                    <span className="text-[10px] text-slate-400">Bypass RBAC matrix</span>
                  </div>
                </label>
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
                  {editingPage ? 'Save Changes' : 'Register Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

