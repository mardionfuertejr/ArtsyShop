'use client';

import { useState, useEffect } from 'react';
import { MOCK_MATERIALS, getMockMaterials, saveMockMaterial, deleteMockMaterial } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { createClient } from '@/lib/supabase/client';

export default function AdminMaterialsClient({ initialMaterials = [] }) {
  const [materials, setMaterials] = useState(() => (initialMaterials.length > 0 ? initialMaterials : getMockMaterials()));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [materialToDelete, setMaterialToDelete] = useState(null);

  // Sync custom materials or initial materials on mount
  useEffect(() => {
    const sanitizeUnits = (list) =>
      list.map((m) => ({
        ...m,
        unit: m.unit === '100 pcs' || m.unit === '100pcs' ? 'pack' : (m.unit || 'pcs'),
      }));

    if (initialMaterials && initialMaterials.length > 0) {
      setMaterials(sanitizeUnits(initialMaterials));
      return;
    }
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('likha_custom_materials');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = sanitizeUnits(
              parsed.filter((m) => m && m.id && !m.id.startsWith('mat-0') && !m.id.startsWith('mat-1'))
            );
            localStorage.setItem('likha_custom_materials', JSON.stringify(clean));
            if (clean.length > 0) {
              setMaterials(clean);
            }
          }
        }
      }
    } catch {}
  }, [initialMaterials]);

  // Modal State for New / Edit Material
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Lock body & html scroll and listen for ESC key when any modal is open
  const isAnyMaterialModalOpen = Boolean(materialToDelete || isModalOpen);

  useEffect(() => {
    if (isAnyMaterialModalOpen) {
      const origBodyOverflow = document.body.style.overflow;
      const origDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (materialToDelete) setMaterialToDelete(null);
          else if (isModalOpen) setIsModalOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origDocOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isAnyMaterialModalOpen, materialToDelete, isModalOpen]);

  // Reset page on category, search query, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, pageSize]);

  // Close action menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('.action-menu-dropdown-container')) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: 'Chenille Stems',
    current_stock: 0,
    unit: 'pcs',
    cost_per_unit: 0,
    minimum_stock: 10,
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const defaultCategories = ['Chenille Stems', 'Floral Supplies', 'Wrappers & Ribbons', 'Packaging'];
  const availableCategories = Array.from(new Set([
    ...defaultCategories,
    ...materials.map(m => m.category).filter(Boolean),
  ]));
  const categories = ['all', ...availableCategories];

  const filteredMaterials = materials
    .filter((m) => {
      const matchesCat = activeCategory === 'all' || m.category === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

  const totalMaterials = filteredMaterials.length;
  const totalPages = Math.max(1, Math.ceil(totalMaterials / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedMaterials = filteredMaterials.slice(startIndex, startIndex + pageSize);

  const lowStockCount = materials.filter((m) => m.current_stock <= m.minimum_stock).length;
  const totalValuation = materials.reduce((sum, m) => sum + m.current_stock * m.cost_per_unit, 0);

  // Quick adjust stock
  const handleQuickAdjust = async (id, delta) => {
    let targetNewStock = 0;
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const newStock = Math.max(0, m.current_stock + delta);
          targetNewStock = newStock;
          return { ...m, current_stock: newStock };
        }
        return m;
      })
    );

    try {
      const supabase = createClient();
      if (supabase && id && !id.startsWith('mat-')) {
        await supabase.from('materials').update({ current_stock: targetNewStock }).eq('id', id);
      }
    } catch (err) {
      console.error('Failed to sync stock with Supabase:', err);
    }

    showToast(`Stock updated!`);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormData({
      id: `mat-${Date.now()}`,
      name: '',
      category: 'Chenille Stems',
      current_stock: 50,
      unit: 'pcs',
      cost_per_unit: 2.0,
      minimum_stock: 20,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (m) => {
    setEditingMaterial(m);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormData({ ...m });
    setIsModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    const matId = materialToDelete.id;
    deleteMockMaterial(matId);
    setMaterials((prev) => {
      const next = prev.filter((m) => m.id !== matId);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('likha_custom_materials', JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    try {
      const supabase = createClient();
      if (supabase && matId && !matId.startsWith('mat-')) {
        await supabase.from('materials').delete().eq('id', matId);
      }
    } catch (err) {
      console.error('Failed to delete material in Supabase:', err);
    }

    showToast(`Deleted ${materialToDelete.name}`);
    setMaterialToDelete(null);
  };

  // Save Material
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const finalCategory = (isCustomCategory && customCategoryInput.trim())
      ? customCategoryInput.trim()
      : (formData.category || 'Chenille Stems');

    const payload = {
      ...formData,
      category: finalCategory,
      id: formData.id || `mat-${Date.now()}`,
      current_stock: parseFloat(formData.current_stock) || 0,
      cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
      minimum_stock: parseFloat(formData.minimum_stock) || 0,
    };

    saveMockMaterial(payload);

    setMaterials((prev) => {
      let next;
      if (editingMaterial) {
        next = prev.map((m) => (m.id === payload.id ? payload : m));
      } else {
        next = [payload, ...prev];
      }
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('likha_custom_materials', JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    try {
      const supabase = createClient();
      if (supabase) {
        const dbPayload = {
          name: payload.name,
          category: payload.category,
          unit: payload.unit,
          current_unit_cost: payload.cost_per_unit,
          current_stock: payload.current_stock,
          minimum_stock: payload.minimum_stock,
        };

        if (editingMaterial && editingMaterial.id && !editingMaterial.id.startsWith('mat-')) {
          await supabase.from('materials').update(dbPayload).eq('id', editingMaterial.id);
        } else {
          const { data: inserted } = await supabase.from('materials').insert(dbPayload).select('id').single();
          if (inserted && inserted.id) {
            setMaterials(prev => prev.map(m => m.id === payload.id ? { ...m, id: inserted.id } : m));
          }
        }
      }
    } catch (err) {
      console.error('Failed to save material to Supabase:', err);
    }

    showToast(editingMaterial ? `Updated material ${formData.name}` : `Added new material ${formData.name}`);
    setIsModalOpen(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1160px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="admin-toast" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999 }}>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
            Raw Materials & Inventory
          </h1>
          <span style={{
            background: 'rgba(180, 83, 9, 0.1)',
            color: 'var(--color-primary, #b45309)',
            fontSize: '12px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}>
            {filteredMaterials.length} {filteredMaterials.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn btn-primary btn-sm"
          style={{ height: '38px', padding: '0 16px', borderRadius: '10px', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', border: 'none' }}
        >
          + Add Material
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div className="admin-filter-tabs" style={{ margin: 0, display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {categories.map((cat) => {
            const count = cat === 'all' 
              ? materials.length 
              : materials.filter(m => m.category === cat).length;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`filter-tab ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                }}
                style={{
                  border: isActive ? '1px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '600',
                  background: isActive ? 'var(--color-primary, #b45309)' : '#ffffff',
                  color: isActive ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 2px 6px rgba(180, 83, 9, 0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.color = '#0f172a';
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.background = '#ffffff';
                  }
                }}
              >
                <span>{cat === 'all' ? 'All Materials' : cat}</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: isActive ? 'rgba(255, 255, 255, 0.22)' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#64748b',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          height: '38px',
          padding: '0 12px',
          width: '260px',
          maxWidth: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8', fontSize: '12px', marginRight: '8px' }}></i>
          <input
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '12.5px',
              color: '#0f172a',
              width: '100%',
              padding: 0,
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Materials Table Card */}
      <div className="data-table-wrapper" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'visible', margin: 0, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
              <th style={{ width: '30%', padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Material Name</th>
              <th style={{ width: '18%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Category</th>
              <th style={{ width: '18%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Current Stock</th>
              <th style={{ width: '14%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Unit Cost</th>
              <th style={{ width: '12%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Status</th>
              <th style={{ width: '8%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Action</th>
            </tr>
          </thead>
          <tbody key={`${activeCategory}-${searchQuery}-${currentPage}`} className="table-fade-enter">
            {paginatedMaterials.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty-cell" style={{ textAlign: 'center', padding: '120px 20px', border: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#f8fafc', color: '#94a3b8', marginBottom: '14px', fontSize: '22px' }}>
                    <i className="fa-solid fa-boxes-stacked" style={{ opacity: 0.8 }}></i>
                  </div>
                  <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>No materials found</p>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                    {searchQuery || activeCategory !== 'all' ? 'Try adjusting your search or category filter.' : 'Click "+ Add Material" to register your first raw material.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedMaterials.map((m, idx) => {
                const rowKey = `${m.id}-${idx}`;
                const isNearBottom = paginatedMaterials.length <= 3 ? idx >= 1 : idx >= paginatedMaterials.length - 2;
                const isLow = m.current_stock <= m.minimum_stock;
                const isOut = m.current_stock === 0;

                return (
                  <tr key={rowKey} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background 0.12s ease' }}>
                    <td style={{ padding: '13px 18px', borderBottom: '1px solid #E2E8F0' }}>
                      <p style={{ fontWeight: '700', color: '#0f172a', margin: 0, fontSize: '13.5px' }}>
                        {m.name}
                      </p>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ color: '#475569', fontWeight: '600', fontSize: '13px' }}>
                        {m.category}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                        {m.current_stock} {m.unit || 'pcs'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                      {formatCurrency(m.cost_per_unit ?? m.current_unit_cost ?? 0)}
                    </td>
                    <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                      {isOut ? (
                        <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', padding: '0 8px', height: '24px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', boxSizing: 'border-box', textAlign: 'center' }}>
                          OUT OF STOCK
                        </span>
                      ) : isLow ? (
                        <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', padding: '0 8px', height: '24px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', boxSizing: 'border-box', textAlign: 'center' }}>
                          LOW STOCK
                        </span>
                      ) : (
                        <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', padding: '0 8px', height: '24px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', boxSizing: 'border-box', textAlign: 'center' }}>
                          IN STOCK
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div className="action-menu-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === rowKey ? null : rowKey);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeMenuId === rowKey ? '#f1f5f9' : 'transparent',
                            color: activeMenuId === rowKey ? '#0f172a' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (activeMenuId !== rowKey) {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#0f172a';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeMenuId !== rowKey) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#64748b';
                            }
                          }}
                          title="Actions"
                        >
                          <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>

                        {/* Dropdown Menu with Icons and Divider */}
                        {activeMenuId === rowKey && (
                          <div
                            style={{
                              position: 'absolute',
                              ...(isNearBottom
                                ? { bottom: 'calc(100% + 4px)', transformOrigin: 'bottom right' }
                                : { top: 'calc(100% + 4px)', transformOrigin: 'top right' }),
                              right: 0,
                              background: '#ffffff',
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                              border: '1px solid #f1f5f9',
                              padding: '4px',
                              zIndex: 50,
                              minWidth: '150px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              textAlign: 'left',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenEdit(m);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'transparent',
                                color: '#334155',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-regular fa-pen-to-square" style={{ fontSize: '12px', color: '#64748b', width: '14px' }}></i>
                              <span>Edit Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleQuickAdjust(m.id, 10);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'transparent',
                                color: '#166534',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-solid fa-plus" style={{ fontSize: '11px', color: '#16a34a', width: '14px' }}></i>
                              <span>Add 10 {m.unit}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleQuickAdjust(m.id, -1);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'transparent',
                                color: '#334155',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-solid fa-minus" style={{ fontSize: '11px', color: '#64748b', width: '14px' }}></i>
                              <span>Deduct 1 {m.unit}</span>
                            </button>

                            <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }}></div>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setMaterialToDelete(m);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'transparent',
                                color: '#dc2626',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-regular fa-trash-can" style={{ fontSize: '12px', color: '#dc2626', width: '14px' }}></i>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls (only if more than 10 materials) */}
        {totalMaterials > 10 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderTop: '1px solid #E2E8F0',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            {/* Entries Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Showing <strong style={{ color: '#0f172a', fontWeight: '700' }}>{startIndex + 1}–{Math.min(startIndex + pageSize, totalMaterials)}</strong> of <strong style={{ color: '#0f172a', fontWeight: '700' }}>{totalMaterials}</strong> items
              </span>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: '#334155',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safeCurrentPage === 1 ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage === 1 ? '#cbd5e1' : '#334155',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-chevron-left" style={{ fontSize: '9px' }}></i>
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - safeCurrentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} style={{ padding: '0 3px', color: '#94a3b8', fontSize: '11px' }}>…</span>;
                  }
                  return null;
                }

                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: '28px',
                      height: '28px',
                      padding: '0 6px',
                      fontSize: '11.5px',
                      fontWeight: isActive ? '800' : '600',
                      borderRadius: '6px',
                      border: isActive ? '1px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
                      background: isActive ? 'var(--color-primary, #b45309)' : '#ffffff',
                      color: isActive ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safeCurrentPage === totalPages ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage === totalPages ? '#cbd5e1' : '#334155',
                  cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Next</span>
                <i className="fa-solid fa-chevron-right" style={{ fontSize: '9px' }}></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Material Modal */}
      {isModalOpen && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'adminModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              animation: 'adminModalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {editingMaterial ? 'Edit Material' : 'Add New Craft Material'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Material Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '600', color: '#0F172A', boxSizing: 'border-box' }}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Chenille Fuzzy Wire (Blush Pink)"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', margin: 0 }}>
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory);
                        if (!isCustomCategory) {
                          setCustomCategoryInput('');
                        }
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: 'var(--color-primary, #b45309)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {isCustomCategory ? 'Select existing' : '+ New Category'}
                    </button>
                  </div>

                  {isCustomCategory ? (
                    <input
                      type="text"
                      placeholder="Type category name (e.g. Tools)..."
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: '9px',
                        border: '1.5px solid var(--color-primary, #b45309)',
                        background: '#FFFFFF',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      autoFocus
                    />
                  ) : (
                    <select
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '12.5px', fontWeight: '600', color: '#0F172A', boxSizing: 'border-box' }}
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategory(true);
                          setCustomCategoryInput('');
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__custom__">+ Add Custom Category...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Unit of Measure <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '600', color: '#0F172A', boxSizing: 'border-box' }}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs, sheets, grams, rolls"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Current Stock
                  </label>
                  <input
                    type="number"
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '700', color: '#0F172A', boxSizing: 'border-box' }}
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Unit Cost (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '700', color: '#0F172A', boxSizing: 'border-box' }}
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Min. Alert
                  </label>
                  <input
                    type="number"
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '700', color: '#0F172A', boxSizing: 'border-box' }}
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    height: '38px',
                    boxSizing: 'border-box',
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    borderRadius: '999px',
                    padding: '0 16px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    margin: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    height: '38px',
                    boxSizing: 'border-box',
                    background: 'var(--color-primary, #b45309)',
                    border: '1px solid var(--color-primary, #b45309)',
                    borderRadius: '999px',
                    padding: '0 16px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    margin: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  {editingMaterial ? 'Save Changes' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {materialToDelete && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            animation: 'adminModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => setMaterialToDelete(null)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
              animation: 'adminModalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              margin: '0 auto 14px',
            }}>
              <i className="fa-regular fa-trash-can"></i>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Delete Material?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong style={{ color: '#0f172a' }}>{materialToDelete.name}</strong> from inventory?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  borderRadius: '999px',
                  border: '1px solid #e2e8f0',
                  background: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  margin: 0,
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  margin: 0,
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
