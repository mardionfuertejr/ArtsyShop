'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getMockProducts, getMockCategories, saveMockProduct, deleteMockProduct } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function AdminProductsClient({ initialProducts, categories = [] }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const filterRef = useRef(null);
  const searchInputRef = useRef(null);

  // View Mode: 'list' | 'form'
  const [viewMode, setViewMode] = useState('list');
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, pageSize]);

  // Close three-dots action menu on outside click
  useEffect(() => {
    function handleDocClick(e) {
      if (!e.target.closest('.action-menu-dropdown-container')) {
        setOpenActionMenuId(null);
      }
    }
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState(null);

  // Lock body scroll and listen for ESC key when modal is open
  useEffect(() => {
    if (productToDelete) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setProductToDelete(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [productToDelete]);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    slug: '',
    category_id: '',
    base_price: 250,
    description: '',
    is_available: true,
    is_bestseller: false,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    product_photos: [],
    product_options: [],
  });

  // Dynamic Category Management
  const [categoriesList, setCategoriesList] = useState(
    categories && categories.length > 0 ? categories : getMockCategories()
  );
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Actual Photo Upload State
  const fileInputRef = useRef(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const main = document.querySelector('.admin-main');
      if (main) main.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // Create New Category dynamically
  const handleCreateNewCategory = async () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim();
    const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
    const newCat = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      display_order: categoriesList.length + 1,
    };

    setCategoriesList((prev) => [...prev, newCat]);
    setFormData((prev) => ({ ...prev, category_id: newCat.id }));
    setNewCatName('');
    setIsAddingNewCat(false);

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('categories').insert({
          name: newCat.name,
          slug: newCat.slug,
          display_order: newCat.display_order,
        });
      }
    } catch {}

    showToast(`Added new category "${name}"`);
  };

  // Open Form for New Product
  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({
      id: '',
      name: '',
      slug: '',
      category_id: categoriesList[0]?.id || '',
      base_price: 250,
      description: '',
      is_available: true,
      is_bestseller: false,
      is_ready_made: false,
      ready_made_stock: 0,
      is_on_sale: false,
      sale_price: 0,
      sale_tag: '',
      is_sold_out: false,
      product_photos: [],
      product_options: [
        {
          id: `opt-${Date.now()}-1`,
          option_name: 'Color Theme',
          is_required: true,
          display_order: 1,
          choices: [
            { label: 'Pastel Blush Pink', extra_cost: 0 },
            { label: 'Crimson Velvet Red', extra_cost: 0 },
            { label: 'Lilac Lavender', extra_cost: 0 },
          ],
        },
      ],
    });
    setViewMode('form');
    scrollToTop();
  };

  // Open Form for Editing Existing Product
  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      id: prod.id,
      name: prod.name || '',
      slug: prod.slug || '',
      category_id: prod.category?.id || prod.category_id || categories[0]?.id || '',
      base_price: parseFloat(prod.base_price) || 0,
      description: prod.description || '',
      is_available: prod.is_available !== false,
      is_bestseller: Boolean(prod.is_bestseller),
      is_ready_made: Boolean(prod.is_ready_made),
      ready_made_stock: prod.ready_made_stock || 0,
      is_on_sale: Boolean(prod.is_on_sale),
      sale_price: parseFloat(prod.sale_price) || 0,
      sale_tag: prod.sale_tag || '',
      is_sold_out: Boolean(prod.is_sold_out),
      product_photos: prod.product_photos ? JSON.parse(JSON.stringify(prod.product_photos)) : [],
      product_options: prod.product_options ? JSON.parse(JSON.stringify(prod.product_options)) : [],
    });
    setViewMode('form');
    scrollToTop();
  };

  // Auto-generate slug from name if creating new
  const handleNameChange = (name) => {
    setFormData((prev) => {
      const updates = { ...prev, name };
      if (!editingProduct || !prev.slug) {
        updates.slug = name
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim();
      }
      return updates;
    });
  };

  // Toggle availability directly from table
  const handleToggleAvailability = async (prod) => {
    const updatedStatus = !prod.is_available;
    const updatedProd = { ...prod, is_available: updatedStatus };

    setProducts((prev) => prev.map((p) => (p.id === prod.id ? updatedProd : p)));
    saveMockProduct(updatedProd);

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('products').update({ is_available: updatedStatus }).eq('id', prod.id);
      }
    } catch {}

    showToast(`Updated ${prod.name} to ${updatedStatus ? 'Available' : 'Disabled'}`);
  };

  // Delete product handler
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const prodId = productToDelete.id;

    setProducts((prev) => prev.filter((p) => p.id !== prodId));
    deleteMockProduct(prodId);

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('products').delete().eq('id', prodId);
      }
    } catch {}

    showToast(`Deleted ${productToDelete.name}`);
    setProductToDelete(null);
  };

  // Actual Photos File Upload Handler
  const handlePhotoFiles = async (filesList) => {
    const files = Array.from(filesList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setUploadingPhotos(true);

    const newPhotos = [];
    for (const file of files) {
      const localUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });

      let storagePath = null;
      try {
        const supabase = createClient();
        if (supabase) {
          const fileExt = file.name.split('.').pop();
          const fileName = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from('product-photos')
            .upload(fileName, file);
          if (!error && data) {
            storagePath = data.path;
          }
        }
      } catch {}

      newPhotos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: localUrl,
        storage_path: storagePath,
        is_cover: formData.product_photos.length === 0 && newPhotos.length === 0,
        display_order: formData.product_photos.length + newPhotos.length + 1,
      });
    }

    setFormData((prev) => ({
      ...prev,
      product_photos: [...prev.product_photos, ...newPhotos],
    }));

    setUploadingPhotos(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast(`Uploaded ${newPhotos.length} photo(s)`);
  };

  const handleSetCoverPhoto = (photoId) => {
    setFormData((prev) => ({
      ...prev,
      product_photos: prev.product_photos.map((p) => ({
        ...p,
        is_cover: p.id === photoId,
      })),
    }));
  };

  const handleDeletePhoto = (photoId) => {
    setFormData((prev) => {
      const filtered = prev.product_photos.filter((p) => p.id !== photoId);
      if (filtered.length > 0 && !filtered.some((p) => p.is_cover)) {
        filtered[0].is_cover = true;
      }
      return { ...prev, product_photos: filtered };
    });
  };

  // Options Management
  const handleAddOptionGroup = () => {
    const newGroup = {
      id: `opt-${Date.now()}`,
      option_name: 'Customization Group',
      is_required: false,
      display_order: formData.product_options.length + 1,
      choices: [{ label: 'Standard Option', extra_cost: 0 }],
    };
    setFormData((prev) => ({
      ...prev,
      product_options: [...prev.product_options, newGroup],
    }));
  };

  const handleUpdateOptionGroupName = (optId, newName) => {
    setFormData((prev) => ({
      ...prev,
      product_options: prev.product_options.map((opt) =>
        opt.id === optId ? { ...opt, option_name: newName } : opt
      ),
    }));
  };

  const handleToggleOptionRequired = (optId) => {
    setFormData((prev) => ({
      ...prev,
      product_options: prev.product_options.map((opt) =>
        opt.id === optId ? { ...opt, is_required: !opt.is_required } : opt
      ),
    }));
  };

  const handleDeleteOptionGroup = (optId) => {
    setFormData((prev) => ({
      ...prev,
      product_options: prev.product_options.filter((opt) => opt.id !== optId),
    }));
  };

  const handleAddChoice = (optId) => {
    setFormData((prev) => ({
      ...prev,
      product_options: prev.product_options.map((opt) => {
        if (opt.id === optId) {
          return {
            ...opt,
            choices: [...(opt.choices || []), { label: 'New Choice', extra_cost: 0 }],
          };
        }
        return opt;
      }),
    }));
  };

  const handleUpdateChoice = (optId, choiceIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      product_options: prev.product_options.map((opt) => {
        if (opt.id === optId) {
          const updatedChoices = [...(opt.choices || [])];
          updatedChoices[choiceIndex] = {
            ...updatedChoices[choiceIndex],
            [field]: field === 'extra_cost' ? (parseFloat(value) || 0) : value,
          };
          return { ...opt, choices: updatedChoices };
        }
        return opt;
      }),
    }));
  };

  const handleDeleteChoice = (optId, choiceIndex) => {
    setFormData((prev) => ({
      ...prev,
      product_options: prev.product_options.map((opt) => {
        if (opt.id === optId) {
          return {
            ...opt,
            choices: opt.choices.filter((_, idx) => idx !== choiceIndex),
          };
        }
        return opt;
      }),
    }));
  };

  // Save Form Submission
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      alert('Please provide a product title and URL slug.');
      return;
    }

    setSaving(true);
    const categoryObj = categories.find((c) => c.id === formData.category_id) || categories[0];

    const payload = {
      id: formData.id || `prod-${Date.now()}`,
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      category: categoryObj,
      category_id: categoryObj?.id,
      base_price: parseFloat(formData.base_price) || 0,
      description: formData.description.trim(),
      is_available: formData.is_available,
      is_bestseller: formData.is_bestseller,
      is_ready_made: formData.is_ready_made,
      ready_made_stock: parseInt(formData.ready_made_stock, 10) || 0,
      is_on_sale: formData.is_on_sale,
      sale_price: parseFloat(formData.sale_price) || 0,
      sale_tag: formData.sale_tag.trim(),
      is_sold_out: formData.is_sold_out,
      product_photos: formData.product_photos,
      product_options: formData.product_options,
    };

    const saved = saveMockProduct(payload);
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('products').upsert({
          id: saved.id,
          name: saved.name,
          slug: saved.slug,
          category_id: saved.category_id,
          base_price: saved.base_price,
          description: saved.description,
          is_available: saved.is_available,
        });

        for (const opt of saved.product_options || []) {
          await supabase.from('product_options').upsert({
            id: opt.id.startsWith('opt-') ? undefined : opt.id,
            product_id: saved.id,
            option_name: opt.option_name,
            choices: opt.choices,
            is_required: opt.is_required,
            display_order: opt.display_order,
          });
        }
      }
    } catch {}

    setSaving(false);
    setViewMode('list');
    scrollToTop();
    showToast(editingProduct ? `Updated ${saved.name}!` : `Created ${saved.name}! 🎉`);
  };

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCatObj = categories.find((c) => c.slug === activeCategory || c.id === activeCategory);
  const activeCatLabel = activeCategory === 'all' ? 'All Categories' : activeCatObj?.name || activeCategory;

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      activeCategory === 'all' || p.category?.slug === activeCategory || p.category_id === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalProducts = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const coverPhotoPreview =
    formData.product_photos.find((p) => p.is_cover)?.url ||
    formData.product_photos[0]?.url ||
    'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80';

  return (
    <div style={{ width: '100%', maxWidth: '1160px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="admin-toast" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999 }}>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 1: PRODUCT CATALOG TABLE (LIST VIEW)
         ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
                Product Catalog
              </h1>
              <span style={{
                background: 'rgba(180, 83, 9, 0.1)',
                color: 'var(--color-primary, #b45309)',
                fontSize: '12px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}>
                {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>

            {/* Search Bar + New Product Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search Bar */}
              <div
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: isFocused ? '1.5px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  height: '38px',
                  padding: '0 4px 0 12px',
                  width: '300px',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  boxShadow: isFocused ? '0 0 0 3px rgba(180, 83, 9, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
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
                      searchInputRef.current?.focus();
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px',
                      marginRight: '4px',
                    }}
                  >
                    ✕
                  </button>
                )}

                <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px 0 2px', flexShrink: 0 }}></div>

                {/* Filter Pill Button */}
                <div style={{ position: 'relative' }} ref={filterRef}>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      borderRadius: '7px',
                      border: 'none',
                      background: activeCategory !== 'all' ? 'rgba(180, 83, 9, 0.12)' : 'transparent',
                      color: activeCategory !== 'all' ? 'var(--color-primary, #b45309)' : '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {activeCategory !== 'all' && (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary, #b45309)', display: 'inline-block', flexShrink: 0 }}></span>
                    )}
                    <span>{activeCategory === 'all' ? 'Category' : activeCatLabel}</span>
                    <i
                      className="fa-solid fa-chevron-down"
                      style={{
                        fontSize: '9.5px',
                        color: activeCategory !== 'all' ? 'var(--color-primary, #b45309)' : '#94a3b8',
                        transition: 'transform 0.2s ease',
                        transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>

                  {/* Filter Dropdown */}
                  {isFilterOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        background: '#ffffff',
                        borderRadius: '10px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                        border: 'none',
                        padding: '4px',
                        zIndex: 50,
                        minWidth: '190px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCategory('all');
                          setIsFilterOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: activeCategory === 'all' ? '#FAF6F0' : 'transparent',
                          color: activeCategory === 'all' ? 'var(--color-primary, #b45309)' : '#334155',
                          fontSize: '12px',
                          fontWeight: activeCategory === 'all' ? '700' : '500',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>All Categories</span>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>{products.length}</span>
                      </button>

                      {categories.map((cat) => {
                        const isSelected = activeCategory === cat.slug || activeCategory === cat.id;
                        const count = products.filter((p) => p.category?.slug === cat.slug || p.category_id === cat.id).length;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setActiveCategory(cat.slug);
                              setIsFilterOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: isSelected ? '#FAF6F0' : 'transparent',
                              color: isSelected ? 'var(--color-primary, #b45309)' : '#334155',
                              fontSize: '12px',
                              fontWeight: isSelected ? '700' : '500',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <span>{cat.name}</span>
                            <span style={{ fontSize: '11px', opacity: 0.7 }}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* + New Product Button */}
              <button
                type="button"
                id="new-product-btn"
                onClick={handleOpenNew}
                className="btn btn-primary btn-sm"
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                + New Product
              </button>
            </div>
          </div>

          {/* Products Table Card */}
          <div className="data-table-wrapper" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'visible', margin: 0, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '36%', padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Product</th>
                  <th style={{ width: '18%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Category</th>
                  <th style={{ width: '16%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Base Price</th>
                  <th style={{ width: '14%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Options</th>
                  <th style={{ width: '10%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Status</th>
                  <th style={{ width: '6%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Action</th>
                </tr>
              </thead>
              <tbody key={`${activeCategory}-${searchQuery}-${currentPage}`} className="table-fade-enter">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', border: 'none' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: '#f8fafc', color: '#94a3b8', marginBottom: '10px', fontSize: '18px' }}>
                        <i className="fa-solid fa-box-open" style={{ opacity: 0.7 }}></i>
                      </div>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>No products found</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        {searchQuery || activeCategory !== 'all' ? 'Try adjusting your search or filters.' : 'Click "+ New Product" to create your first product.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p, idx) => {
                    const isNearBottom = paginatedProducts.length <= 3 ? idx >= 1 : idx >= paginatedProducts.length - 2;
                    const coverPhoto =
                      p.product_photos?.find((ph) => ph.is_cover)?.url ||
                      p.product_photos?.[0]?.url ||
                      'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80';

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s ease' }}>
                        <td style={{ padding: '13px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={coverPhoto}
                              alt={p.name}
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <p style={{ fontWeight: '700', color: '#0f172a', margin: 0, fontSize: '13px', lineHeight: 1.3 }}>
                                {p.name}
                              </p>
                              {(p.is_sold_out || p.is_bestseller || p.is_on_sale || p.is_ready_made) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                  {p.is_sold_out && (
                                    <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '1.5px 6px', borderRadius: '4px', background: '#334155', color: '#fff', lineHeight: 1.2 }}>
                                      SOLD OUT
                                    </span>
                                  )}
                                  {p.is_bestseller && (
                                    <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '1.5px 6px', borderRadius: '4px', background: '#FFEDD5', color: '#C2410C', lineHeight: 1.2 }}>
                                      Bestseller
                                    </span>
                                  )}
                                  {p.is_on_sale && (
                                    <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '1.5px 6px', borderRadius: '4px', background: '#FEE2E2', color: '#B91C1C', lineHeight: 1.2 }}>
                                      {p.sale_tag || 'Sale'}
                                    </span>
                                  )}
                                  {p.is_ready_made && (
                                    <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '1.5px 6px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', lineHeight: 1.2 }}>
                                      On-Hand ({p.ready_made_stock || 0})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ background: '#f1f5f9', color: '#334155', fontWeight: '700', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>
                            {p.category?.name || 'Crafts'}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>
                          {formatCurrency(p.base_price)}
                        </td>
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                          {p.product_options?.length > 0 ? (
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center' }}>
                              {p.product_options.length} {p.product_options.length === 1 ? 'option' : 'options'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                              —
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(p)}
                            style={{
                              cursor: 'pointer',
                              border: 'none',
                              fontSize: '11px',
                              padding: '0 8px',
                              height: '24px',
                              borderRadius: '9999px',
                              fontWeight: '800',
                              letterSpacing: '0.04em',
                              width: '96px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              textAlign: 'center',
                              background: p.is_available ? '#DCFCE7' : '#F1F5F9',
                              color: p.is_available ? '#166534' : '#64748b',
                            }}
                            title="Click to toggle availability"
                          >
                            {p.is_available ? 'AVAILABLE' : 'DISABLED'}
                          </button>
                        </td>
                        <td style={{ padding: '13px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div className="action-menu-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(openActionMenuId === p.id ? null : p.id);
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: 'none',
                                background: openActionMenuId === p.id ? '#f1f5f9' : 'transparent',
                                color: openActionMenuId === p.id ? '#0f172a' : '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.12s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (openActionMenuId !== p.id) {
                                  e.currentTarget.style.background = '#f1f5f9';
                                  e.currentTarget.style.color = '#0f172a';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (openActionMenuId !== p.id) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#64748b';
                                }
                              }}
                              title="Actions"
                            >
                              <i className="fa-solid fa-ellipsis-vertical"></i>
                            </button>

                            {/* Dropdown Menu with Icons and Divider */}
                            {openActionMenuId === p.id && (
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
                                  minWidth: '145px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  textAlign: 'left',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenEdit(p);
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
                                  <span>Edit Product</span>
                                </button>

                                <Link
                                  href={`/shop/${p.slug}`}
                                  target="_blank"
                                  onClick={() => setOpenActionMenuId(null)}
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
                                    textDecoration: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'background 0.1s ease',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <i className="fa-regular fa-eye" style={{ fontSize: '12px', color: '#64748b', width: '14px' }}></i>
                                  <span>View in Store</span>
                                </Link>

                                <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }}></div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setProductToDelete(p);
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

            {/* Pagination Controls (only if more than 10 products) */}
            {totalProducts > 10 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderTop: '1px solid #f1f5f9',
                background: '#ffffff',
                flexWrap: 'wrap',
                gap: '10px',
              }}>
                {/* Entries Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                    Showing <strong style={{ color: '#0f172a', fontWeight: '700' }}>{startIndex + 1}–{Math.min(startIndex + pageSize, totalProducts)}</strong> of <strong style={{ color: '#0f172a', fontWeight: '700' }}>{totalProducts}</strong> products
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 2: DEDICATED IN-PAGE PRODUCT FORM (BORDERLESS & CLEAN)
         ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'form' && (
        <form onSubmit={handleSaveProduct} className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Clean Header Action Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#ffffff',
            padding: '12px 18px',
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  scrollToTop();
                }}
                className="btn btn-secondary btn-sm"
                style={{
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: 'none',
                  background: '#f1f5f9',
                }}
              >
                ← Back
              </button>

              <div>
                <h1 style={{ margin: 0, fontSize: '16.5px', fontWeight: '800', color: '#0f172a' }}>
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}
                </h1>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                  {editingProduct ? `ID: ${editingProduct.id}` : 'Fill in the information below'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  scrollToTop();
                }}
                className="btn btn-secondary btn-sm"
                style={{ height: '34px', padding: '0 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', border: 'none', background: '#f1f5f9' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-sm"
                style={{
                  height: '34px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '12px',
                  border: 'none',
                }}
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>

          {/* 2-Column Balanced Form Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: '18px',
            alignItems: 'start',
          }}>
            
            {/* ── LEFT COLUMN: Core Details, Badges & Customizations ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Card 1: General Info */}
              <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', background: '#ffffff', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '13.5px', fontWeight: '800', margin: '0 0 14px', color: '#0f172a' }}>
                  General Information
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Product Title <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Fuzzy Wire Rose Bouquet"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: 'none', background: '#f8fafc', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                        URL Slug <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="fuzzy-wire-rose-bouquet"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        required
                        style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: 'none', background: '#f8fafc', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                        Category <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      
                      {!isAddingNewCat ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <select
                            className="form-input"
                            value={formData.category_id}
                            onChange={(e) => {
                              if (e.target.value === '__new__') {
                                setIsAddingNewCat(true);
                              } else {
                                setFormData({ ...formData, category_id: e.target.value });
                              }
                            }}
                            style={{ flex: 1, height: '36px', padding: '0 10px', borderRadius: '8px', border: 'none', background: '#f8fafc', fontSize: '12px', boxSizing: 'border-box' }}
                          >
                            {categoriesList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                            <option value="__new__">➕ Add New Category...</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsAddingNewCat(true)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap', borderRadius: '8px', border: 'none', background: '#f1f5f9', fontWeight: '700' }}
                          >
                            + New
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Type new category name..."
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            autoFocus
                            style={{ flex: 1, height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--color-primary, #b45309)', background: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                          />
                          <button
                            type="button"
                            onClick={handleCreateNewCategory}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0 12px', fontSize: '11px', borderRadius: '8px', fontWeight: '700' }}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingNewCat(false)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0 10px', fontSize: '11px', borderRadius: '8px', border: 'none', background: '#f1f5f9' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Base Price (₱) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="250.00"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      required
                      style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: 'none', background: '#f8fafc', fontSize: '13.5px', fontWeight: '800', color: '#b45309', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Description
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Handcrafted details, materials, and care instructions..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: 'none', background: '#f8fafc', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Badges & Inventory */}
              <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', background: '#ffffff', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '13.5px', fontWeight: '800', margin: '0 0 12px', color: '#0f172a' }}>
                  Badges & Inventory
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Available */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: formData.is_available ? '#F0FDF4' : '#F8FAFC',
                    cursor: 'pointer',
                    minHeight: '44px',
                    boxSizing: 'border-box',
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Available in Store</span>
                  </label>

                  {/* Bestseller */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: formData.is_bestseller ? '#FFFBEB' : '#F8FAFC',
                    cursor: 'pointer',
                    minHeight: '44px',
                    boxSizing: 'border-box',
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.is_bestseller}
                      onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
                      style={{ width: '15px', height: '15px', accentColor: '#d97706' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>Bestseller Badge</span>
                  </label>

                  {/* Ready-made / On-hand */}
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: formData.is_ready_made ? '#F0FDF4' : '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    minHeight: '44px',
                    boxSizing: 'border-box',
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.is_ready_made}
                        onChange={(e) => setFormData({ ...formData, is_ready_made: e.target.checked })}
                        style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>On-Hand</span>
                    </label>
                    {formData.is_ready_made && (
                      <input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={formData.ready_made_stock}
                        onChange={(e) => setFormData({ ...formData, ready_made_stock: e.target.value })}
                        style={{ width: '55px', height: '26px', padding: '0 6px', borderRadius: '4px', border: 'none', fontSize: '11.5px', background: '#fff' }}
                      />
                    )}
                  </div>

                  {/* On Sale */}
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: formData.is_on_sale ? '#FEF2F2' : '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    minHeight: '44px',
                    boxSizing: 'border-box',
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.is_on_sale}
                        onChange={(e) => setFormData({ ...formData, is_on_sale: e.target.checked })}
                        style={{ width: '15px', height: '15px', accentColor: '#dc2626' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b' }}>On Sale</span>
                    </label>
                    {formData.is_on_sale && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="₱ Sale"
                          value={formData.sale_price}
                          onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                          style={{ width: '60px', height: '26px', padding: '0 4px', borderRadius: '4px', border: 'none', fontSize: '11px', background: '#fff' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Customization Options */}
              <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', background: '#ffffff', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '13.5px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                    Customization Options ({formData.product_options.length})
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddOptionGroup}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 9px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: 'none', background: '#f1f5f9' }}
                  >
                    + Add Group
                  </button>
                </div>

                {formData.product_options.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '14px', background: '#f8fafc', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>No custom options configured</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formData.product_options.map((opt, optIdx) => (
                      <div key={opt.id || optIdx} style={{ padding: '12px', background: '#FAF6F0', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="text"
                            value={opt.option_name}
                            onChange={(e) => handleUpdateOptionGroupName(opt.id, e.target.value)}
                            placeholder="Group Name (e.g. Color Theme)"
                            style={{ flex: 1, height: '30px', padding: '0 8px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '700', background: '#fff' }}
                          />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={opt.is_required}
                              onChange={() => handleToggleOptionRequired(opt.id)}
                            />
                            Required
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteOptionGroup(opt.id)}
                            style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 4px', fontSize: '12px' }}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Choices */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {(opt.choices || []).map((ch, chIdx) => (
                            <div key={chIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="text"
                                placeholder="Choice (e.g. Pink)"
                                value={ch.label}
                                onChange={(e) => handleUpdateChoice(opt.id, chIdx, 'label', e.target.value)}
                                style={{ flex: 1, height: '28px', padding: '0 8px', borderRadius: '4px', border: 'none', fontSize: '11.5px', background: '#fff' }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700' }}>+₱</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={ch.extra_cost || ''}
                                  onChange={(e) => handleUpdateChoice(opt.id, chIdx, 'extra_cost', e.target.value)}
                                  style={{ width: '55px', height: '28px', padding: '0 4px', borderRadius: '4px', border: 'none', fontSize: '11.5px', background: '#fff' }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteChoice(opt.id, chIdx)}
                                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', fontSize: '11px' }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddChoice(opt.id)}
                            style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: 'var(--color-primary, #b45309)', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: '2px 0' }}
                          >
                            + Add Choice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: Photos Gallery & Live Storefront Preview ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Card 4: Photos Gallery */}
              <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', background: '#ffffff', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '13.5px', fontWeight: '800', margin: '0 0 12px', color: '#0f172a' }}>
                  Product Gallery ({formData.product_photos.length})
                </h2>

                {/* Hidden File Input for Device Photo Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                  style={{ display: 'none' }}
                />

                {/* Upload Actual Photo Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPhoto(true);
                  }}
                  onDragLeave={() => setIsDraggingPhoto(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPhoto(false);
                    handlePhotoFiles(e.dataTransfer.files);
                  }}
                  style={{
                    border: isDraggingPhoto ? '2px dashed var(--color-primary, #b45309)' : '2px dashed #cbd5e1',
                    background: isDraggingPhoto ? '#fef3c7' : '#f8fafc',
                    borderRadius: '10px',
                    padding: '16px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginBottom: '14px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i
                    className={uploadingPhotos ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-cloud-arrow-up'}
                    style={{ fontSize: '22px', color: 'var(--color-primary, #b45309)', marginBottom: '6px' }}
                  />
                  <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                    {uploadingPhotos ? 'Processing photo(s)...' : 'Upload Actual Product Photos'}
                  </p>
                  <p style={{ margin: 0, fontSize: '10.5px', color: '#64748b' }}>
                    Click to select from device or drag & drop files here
                  </p>
                </div>

                {/* Photo List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '8px' }}>
                  {formData.product_photos.map((ph) => (
                    <div
                      key={ph.id}
                      style={{
                        position: 'relative',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        height: '75px',
                        background: '#f8fafc',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.url} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                      {ph.is_cover && (
                        <span style={{ position: 'absolute', top: '2px', left: '2px', background: 'var(--color-primary, #b45309)', color: '#fff', fontSize: '8px', fontWeight: '800', padding: '1px 3px', borderRadius: '3px' }}>
                          COVER
                        </span>
                      )}

                      <div style={{ position: 'absolute', bottom: '2px', right: '2px', display: 'flex', gap: '2px' }}>
                        {!ph.is_cover && (
                          <button
                            type="button"
                            onClick={() => handleSetCoverPhoto(ph.id)}
                            title="Set Cover"
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 4px', fontSize: '8px', cursor: 'pointer', fontWeight: '700' }}
                          >
                            Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(ph.id)}
                          title="Delete photo"
                          style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 4px', fontSize: '8px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5: Storefront Preview */}
              <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', background: '#FAF6F0', border: 'none' }}>
                <h2 style={{ fontSize: '12px', fontWeight: '800', margin: '0 0 10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Storefront Preview
                </h2>

                <div style={{ background: '#ffffff', borderRadius: '10px', overflow: 'hidden', border: 'none', maxWidth: '240px', margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ position: 'relative', height: '140px', background: '#f1f5f9' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '6px', left: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {formData.is_bestseller && (
                        <span style={{ fontSize: '8.5px', fontWeight: '800', background: '#FFEDD5', color: '#C2410C', padding: '1px 5px', borderRadius: '4px' }}>
                          Bestseller
                        </span>
                      )}
                      {formData.is_ready_made && (
                        <span style={{ fontSize: '8.5px', fontWeight: '800', background: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '4px' }}>
                          On-Hand ({formData.ready_made_stock || 0})
                        </span>
                      )}
                      {formData.is_on_sale && (
                        <span style={{ fontSize: '8.5px', fontWeight: '800', background: '#FEE2E2', color: '#B91C1C', padding: '1px 5px', borderRadius: '4px' }}>
                          {formData.sale_tag || 'Sale'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '10px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: '9.5px', fontWeight: '700', color: 'var(--color-primary, #b45309)', textTransform: 'uppercase' }}>
                      {categories.find((c) => c.id === formData.category_id)?.name || 'Crafts'}
                    </p>
                    <h3 style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                      {formData.name || 'Product Title'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--color-primary, #b45309)' }}>
                          {formatCurrency(formData.is_on_sale && formData.sale_price ? formData.sale_price : formData.base_price)}
                        </span>
                        {formData.is_on_sale && Boolean(formData.sale_price) && parseFloat(formData.base_price) > 0 && (
                          <span style={{ fontSize: '10.5px', fontWeight: '500', color: '#94a3b8', textDecoration: 'line-through' }}>
                            {formatCurrency(formData.base_price)}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '9.5px', fontWeight: '600', color: '#64748b' }}>
                        {formData.product_options.length} options
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={() => setProductToDelete(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
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
              Delete Product?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong style={{ color: '#0f172a' }}>{productToDelete.name}</strong> from your catalog?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
