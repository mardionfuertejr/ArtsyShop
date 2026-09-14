'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  // Sync custom categories & products on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedCats = localStorage.getItem('likha_custom_categories');
        if (savedCats) {
          const parsed = JSON.parse(savedCats);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategoriesList((prev) => {
              const map = new Map();
              (prev || []).forEach((c) => {
                const key = String(c.id || c.slug || '').trim();
                if (key) map.set(key, c);
              });
              (parsed || []).forEach((c) => {
                const key = String(c.id || c.slug || '').trim();
                if (key) map.set(key, c);
              });
              return Array.from(map.values());
            });
          }
        }

        const savedProds = localStorage.getItem('likha_custom_products');
        if (savedProds) {
          const parsed = JSON.parse(savedProds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Keep only user-created custom products, ignore old seeded mock products
            const cleanCustom = parsed.filter((p) => p && p.id && !p.id.startsWith('prod-0') && !p.id.startsWith('prod-1') && !p.id.startsWith('prod-2') && !p.id.startsWith('prod-3'));
            if (cleanCustom.length !== parsed.length) {
              localStorage.setItem('likha_custom_products', JSON.stringify(cleanCustom));
            }
            if (cleanCustom.length > 0) {
              setProducts((prev) => {
                const map = new Map();
                (prev || []).forEach((p) => {
                  const key = String(p.id || p.slug || '').trim();
                  if (key) map.set(key, p);
                });
                cleanCustom.forEach((p) => {
                  const key = String(p.id || p.slug || '').trim();
                  if (key) map.set(key, p);
                });
                return Array.from(map.values());
              });
            }
          }
        }
      }
    } catch {}
  }, []);

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState(null);

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
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [catToDelete, setCatToDelete] = useState(null);
  const catDropdownRef = useRef(null);

  // Close Category Dropdown on Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Actual Photo Upload State
  const fileInputRef = useRef(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState(null);

  // Lock background scroll (body & html) and listen for ESC key when any modal is open
  const isAnyModalOpen = Boolean(productToDelete || isManageCategoriesOpen || catToDelete || zoomedPhotoUrl);

  useEffect(() => {
    if (isAnyModalOpen) {
      const origBodyOverflow = document.body.style.overflow;
      const origDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (catToDelete) {
            setCatToDelete(null);
          } else if (isManageCategoriesOpen) {
            setIsManageCategoriesOpen(false);
            setEditingCatId(null);
          } else if (productToDelete) {
            setProductToDelete(null);
          } else if (zoomedPhotoUrl) {
            setZoomedPhotoUrl(null);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origDocOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isAnyModalOpen, catToDelete, isManageCategoriesOpen, productToDelete, zoomedPhotoUrl]);

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
  const handleCreateNewCategory = async (customName = null) => {
    const rawName = customName || newCatName;
    if (!rawName || !rawName.trim()) return;
    const name = rawName.trim();
    const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
    const catId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`;
    const newCat = {
      id: catId,
      name,
      slug,
      display_order: categoriesList.length + 1,
    };

    const nextCats = [...categoriesList, newCat];
    setCategoriesList(nextCats);
    setFormData((prev) => ({ ...prev, category_id: newCat.id }));
    setNewCatName('');
    setIsAddingNewCat(false);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('likha_custom_categories', JSON.stringify(nextCats));
      }
    } catch {}

    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      });
    } catch {}

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('categories').upsert({
          id: newCat.id,
          name: newCat.name,
          slug: newCat.slug,
          display_order: newCat.display_order,
          is_active: true,
        });
      }
    } catch {}

    showToast(`Added new category "${name}"`);
  };

  // Update / Rename Category
  const handleUpdateCategory = async (id, updatedName) => {
    if (!updatedName || !updatedName.trim()) return;
    const cleanName = updatedName.trim();
    const cleanSlug = cleanName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();

    const updatedList = categoriesList.map((c) =>
      c.id === id || c.slug === id ? { ...c, name: cleanName, slug: cleanSlug } : c
    );
    setCategoriesList(updatedList);
    setEditingCatId(null);
    setEditingCatName('');

    // Update products that reference this category in state
    setProducts((prev) =>
      prev.map((p) => {
        if (p.category_id === id || p.category?.id === id || p.category?.slug === id) {
          return {
            ...p,
            category: { ...(p.category || {}), name: cleanName, slug: cleanSlug },
          };
        }
        return p;
      })
    );

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('likha_custom_categories', JSON.stringify(updatedList));
      }
    } catch {}

    try {
      await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: cleanName, slug: cleanSlug }),
      });
    } catch {}

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('categories').update({ name: cleanName, slug: cleanSlug }).eq('id', id);
      }
    } catch {}

    showToast(`Updated category "${cleanName}"`);
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    if (!cat) return;
    const catId = cat.id || cat.slug;

    const nextCats = categoriesList.filter((c) => c.id !== catId && c.slug !== catId);
    setCategoriesList(nextCats);
    setCatToDelete(null);

    if (activeCategory === cat.slug || activeCategory === cat.id) {
      setActiveCategory('all');
    }

    // Unlink products referencing this category in local state
    setProducts((prev) =>
      prev.map((p) => {
        if (p.category_id === catId || p.category?.id === catId || p.category?.slug === catId) {
          return { ...p, category_id: null, category: null };
        }
        return p;
      })
    );

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('likha_custom_categories', JSON.stringify(nextCats));
      }
    } catch {}

    try {
      await fetch(`/api/categories?id=${encodeURIComponent(cat.id || cat.slug)}`, {
        method: 'DELETE',
      });
    } catch {}

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('products').update({ category_id: null }).eq('category_id', cat.id);
        await supabase.from('categories').delete().eq('id', cat.id);
      }
    } catch {}

    showToast(`Deleted category "${cat.name}"`);
  };

  // Open Form for New Product
  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({
      id: '',
      name: '',
      slug: '',
      category_id: allKnownCategories[0]?.id || allKnownCategories[0]?.slug || '',
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
          option_name: 'Color',
          is_required: true,
          display_order: 1,
          choices: [
            { label: 'Pink', extra_cost: 0 },
            { label: 'Red', extra_cost: 0 },
            { label: 'Purple', extra_cost: 0 },
            { label: 'Yellow', extra_cost: 0 },
            { label: 'Mixed Colors', extra_cost: 0 },
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

  // Auto-calculate discount percentage and badge tag from price
  const handleSalePriceChange = (val) => {
    setFormData((prev) => {
      const baseNum = parseFloat(prev.base_price) || 0;
      const saleNum = parseFloat(val) || 0;
      let autoTag = '';

      if (baseNum > 0 && saleNum > 0 && saleNum < baseNum) {
        const percent = Math.round(((baseNum - saleNum) / baseNum) * 100);
        autoTag = `${percent}% OFF`;
      } else if (saleNum >= baseNum && baseNum > 0) {
        autoTag = '';
      }

      return {
        ...prev,
        sale_price: val,
        sale_tag: autoTag,
      };
    });
  };

  const handleBasePriceChange = (val) => {
    setFormData((prev) => {
      const baseNum = parseFloat(val) || 0;
      const saleNum = parseFloat(prev.sale_price) || 0;
      let autoTag = prev.sale_tag;

      if (prev.is_on_sale && baseNum > 0 && saleNum > 0 && saleNum < baseNum) {
        const percent = Math.round(((baseNum - saleNum) / baseNum) * 100);
        autoTag = `${percent}% OFF`;
      } else if (saleNum >= baseNum) {
        autoTag = '';
      }

      return {
        ...prev,
        base_price: val,
        sale_tag: autoTag,
      };
    });
  };


  // Toggle availability directly from table
  const handleToggleAvailability = async (prod) => {
    const updatedStatus = !prod.is_available;
    const updatedProd = { ...prod, is_available: updatedStatus };

    setProducts((prev) => prev.map((p) => (p.id === prod.id ? updatedProd : p)));
    saveMockProduct(updatedProd);

    try {
      if (typeof window !== 'undefined') {
        const localList = JSON.parse(localStorage.getItem('likha_custom_products') || '[]');
        const existingIdx = localList.findIndex((p) => p.id === prod.id);
        if (existingIdx >= 0) {
          localList[existingIdx] = updatedProd;
        } else {
          localList.unshift(updatedProd);
        }
        localStorage.setItem('likha_custom_products', JSON.stringify(localList));
      }
    } catch {}

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProd),
      });
    } catch {}

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

    const nextProducts = products.filter((p) => p.id !== prodId);
    setProducts(nextProducts);
    deleteMockProduct(prodId);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('likha_custom_products', JSON.stringify(nextProducts));
      }
    } catch {}

    try {
      await fetch(`/api/products?id=${encodeURIComponent(prodId)}`, {
        method: 'DELETE',
      });
    } catch {}

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
      let photoUrl = localUrl;
      try {
        const supabase = createClient();
        if (supabase) {
          const fileExt = file.name.split('.').pop();
          const fileName = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from('product-photos')
            .upload(fileName, file, { cacheControl: '3600', upsert: true });
          if (!error && data) {
            storagePath = data.path;
            const { data: pubData } = supabase.storage.from('product-photos').getPublicUrl(data.path);
            if (pubData?.publicUrl) {
              photoUrl = pubData.publicUrl;
            }
          }
        }
      } catch {}

      newPhotos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: photoUrl,
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

  // Submit Product Form (Create / Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      alert('Please provide a product title and URL slug.');
      return;
    }

    setSaving(true);
    const categoryObj = categoriesList.find((c) => c.id === formData.category_id || c.slug === formData.category_id) || categoriesList[0] || null;
    
    const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try { return crypto.randomUUID(); } catch {}
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const prodId = (formData.id && formData.id.trim()) ? formData.id.trim() : generateUUID();

    const payload = {
      id: prodId,
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      category: categoryObj,
      category_id: categoryObj?.id || null,
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
      product_photos: formData.product_photos || [],
      product_options: formData.product_options || [],
    };

    const saved = saveMockProduct(payload);
    let updatedProducts = [];
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id || p.slug === saved.slug);
      if (idx >= 0) {
        updatedProducts = [...prev];
        updatedProducts[idx] = saved;
        return updatedProducts;
      }
      updatedProducts = [saved, ...prev];
      return updatedProducts;
    });

    try {
      if (typeof window !== 'undefined') {
        const localList = JSON.parse(localStorage.getItem('likha_custom_products') || '[]');
        const existingIdx = localList.findIndex((p) => p.id === saved.id || p.slug === saved.slug);
        if (existingIdx >= 0) {
          localList[existingIdx] = saved;
        } else {
          localList.unshift(saved);
        }
        localStorage.setItem('likha_custom_products', JSON.stringify(localList));
      }
    } catch {}

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saved),
      });
    } catch {}

    try {
      const supabase = createClient();
      if (supabase) {
        const dbProduct = {
          name: saved.name,
          slug: saved.slug,
          category_id: isValidUUID(saved.category_id) ? saved.category_id : null,
          base_price: saved.base_price,
          description: saved.description,
          is_available: saved.is_available,
        };
        if (isValidUUID(saved.id)) {
          dbProduct.id = saved.id;
        }

        const { data: upserted } = await supabase
          .from('products')
          .upsert(dbProduct, { onConflict: 'slug' })
          .select('id')
          .single();

        const actualId = upserted?.id || (isValidUUID(saved.id) ? saved.id : null);

        if (actualId && Array.isArray(saved.product_photos)) {
          try {
            await supabase.from('product_photos').delete().eq('product_id', actualId);
          } catch {}
          for (const photo of saved.product_photos) {
            await supabase.from('product_photos').insert({
              product_id: actualId,
              storage_path: photo.storage_path || '',
              url: photo.url || '',
              is_cover: Boolean(photo.is_cover),
              display_order: photo.display_order || 0,
            });
          }
        }

        if (actualId && Array.isArray(saved.product_options)) {
          for (const opt of saved.product_options) {
            await supabase.from('product_options').upsert({
              id: isValidUUID(opt.id) ? opt.id : undefined,
              product_id: actualId,
              option_name: opt.option_name,
              choices: opt.choices,
              is_required: Boolean(opt.is_required),
              display_order: opt.display_order || 0,
            });
          }
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

  // Ensure all categories (from categoriesList, custom categories, or products) are known and included
  const allKnownCategories = useMemo(() => {
    const map = new Map();
    (categoriesList || []).forEach((c) => {
      if (c && (c.name || c.slug || c.id)) {
        const key = (c.slug || c.name || c.id).toString().toLowerCase();
        map.set(key, {
          id: c.id || key,
          name: c.name || key,
          slug: c.slug || key,
        });
      }
    });
    (products || []).forEach((p) => {
      if (p.category && p.category.name) {
        const key = (p.category.slug || p.category.name || p.category.id).toString().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: p.category.id || key,
            name: p.category.name,
            slug: p.category.slug || key,
          });
        }
      } else if (p.category_id && typeof p.category_id === 'string' && p.category_id !== 'all' && p.category_id !== 'unassigned') {
        const key = p.category_id.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: p.category_id,
            name: p.category_id.charAt(0).toUpperCase() + p.category_id.slice(1),
            slug: key,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [categoriesList, products]);

  const activeCatObj = allKnownCategories.find((c) => c.slug === activeCategory || c.id === activeCategory);
  const activeCatLabel = activeCategory === 'all' ? 'All Categories' : activeCatObj?.name || activeCategory;

  const filteredProducts = products
    .filter((p) => {
      const pCatSlug = (p.category?.slug || p.category?.name || p.category_id || '').toString().toLowerCase();
      const pCatId = (p.category?.id || p.category_id || '').toString().toLowerCase();
      const targetCat = activeCategory.toLowerCase();

      const matchesCategory =
        activeCategory === 'all' ||
        pCatSlug === targetCat ||
        pCatId === targetCat ||
        (p.category?.name && p.category.name.toLowerCase() === targetCat);

      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

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

                      {allKnownCategories.map((cat) => {
                        const isSelected = activeCategory === cat.slug || activeCategory === cat.id;
                        const count = products.filter((p) => {
                          const pCatSlug = (p.category?.slug || p.category?.name || p.category_id || '').toString().toLowerCase();
                          const pCatId = (p.category?.id || p.category_id || '').toString().toLowerCase();
                          const target = (cat.slug || cat.id || cat.name || '').toString().toLowerCase();
                          return pCatSlug === target || pCatId === target || (p.category?.name && p.category.name.toLowerCase() === target);
                        }).length;
                        return (
                          <button
                            key={cat.id || cat.slug}
                            type="button"
                            onClick={() => {
                              setActiveCategory(cat.slug || cat.id);
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

                      <div style={{ height: '1px', background: '#f1f5f9', margin: '3px 0' }}></div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsFilterOpen(false);
                          setIsManageCategoriesOpen(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#f8fafc',
                          color: 'var(--color-primary, #b45309)',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <i className="fa-solid fa-gear" style={{ fontSize: '11px' }}></i>
                        <span>Manage Categories...</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Manage Categories Button */}
              <button
                type="button"
                id="manage-categories-btn"
                onClick={() => setIsManageCategoriesOpen(true)}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#334155',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <i className="fa-solid fa-layer-group" style={{ color: 'var(--color-primary, #b45309)', fontSize: '13px' }}></i>
                <span>Categories</span>
              </button>

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
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '44%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '44%', padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Product</th>
                  <th style={{ width: '22%', padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Category</th>
                  <th style={{ width: '18%', padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Base Price</th>
                  <th style={{ width: '10%', padding: '12px 10px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Status</th>
                  <th style={{ width: '6%', padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Action</th>
                </tr>
              </thead>
              <tbody key={`${activeCategory}-${searchQuery}-${currentPage}`} className="table-fade-enter">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty-cell" style={{ textAlign: 'center', padding: '120px 20px', border: 'none' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#f8fafc', color: '#94a3b8', marginBottom: '14px', fontSize: '22px' }}>
                        <i className="fa-solid fa-box-open" style={{ opacity: 0.8 }}></i>
                      </div>
                      <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>No products found</p>
                      <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                        {searchQuery || activeCategory !== 'all' ? 'Try adjusting your search or filters.' : 'Click "+ New Product" to create your first product.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                    paginatedProducts.map((p, idx) => {
                    const rowKey = `${p.id || p.slug || 'prod'}-${idx}`;
                    const isNearBottom = paginatedProducts.length <= 3 ? idx >= 1 : idx >= paginatedProducts.length - 2;
                    const coverPhoto =
                      p.product_photos?.find((ph) => ph.is_cover)?.url ||
                      p.product_photos?.[0]?.url ||
                      'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80';

                    return (
                      <tr key={rowKey} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background 0.12s ease' }}>
                        <td style={{ padding: '13px 18px', borderBottom: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={coverPhoto}
                              alt={p.name}
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                objectFit: 'contain',
                                background: '#f8fafc',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: '700', fontSize: '13.5px', color: '#0f172a', lineHeight: 1.3 }}>
                                {p.name}
                              </p>
                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {p.is_bestseller && (
                                  <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    Bestseller
                                  </span>
                                )}
                                {p.is_ready_made && (
                                  <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    On-Hand ({p.ready_made_stock})
                                  </span>
                                )}
                                {p.is_on_sale && (
                                  <span style={{ fontSize: '10px', background: '#FCE7F3', color: '#9D174D', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    Sale
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ color: '#475569', fontWeight: '600', fontSize: '13px' }}>
                            {p.category?.name || categoriesList.find((c) => c.id === p.category_id)?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>
                          {formatCurrency(p.base_price)}
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
                                setOpenActionMenuId(openActionMenuId === rowKey ? null : rowKey);
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: 'none',
                                background: openActionMenuId === rowKey ? '#f1f5f9' : 'transparent',
                                color: openActionMenuId === rowKey ? '#0f172a' : '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.12s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (openActionMenuId !== rowKey) {
                                  e.currentTarget.style.background = '#f1f5f9';
                                  e.currentTarget.style.color = '#0f172a';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (openActionMenuId !== rowKey) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#64748b';
                                }
                              }}
                              title="Actions"
                            >
                              <i className="fa-solid fa-ellipsis-vertical"></i>
                            </button>

                            {/* Dropdown Menu with Icons and Divider */}
                            {openActionMenuId === rowKey && (
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
                borderTop: '1px solid #E2E8F0',
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
            
            {/* ── LEFT COLUMN: Core Details, Pricing & Customizations ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Card 1: General Information */}
              <div className="card" style={{ padding: '20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-info" style={{ color: 'var(--color-primary, #b45309)', fontSize: '14px' }}></i>
                  <span>General Information</span>
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Product Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Product Title <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Fuzzy Wire Rose Bouquet"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '9px',
                        border: '1.5px solid #E2E8F0',
                        background: '#F8FAFC',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Category Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Category <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    
                    {!isAddingNewCat ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div ref={catDropdownRef} style={{ position: 'relative', flex: 1 }}>
                          <button
                            type="button"
                            onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                            style={{
                              width: '100%',
                              height: '38px',
                              padding: '0 12px',
                              borderRadius: '9px',
                              border: isCatDropdownOpen ? '1.5px solid var(--color-primary, #b45309)' : '1.5px solid #E2E8F0',
                              background: '#F8FAFC',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: formData.category_id ? '#0F172A' : '#94A3B8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              transition: 'all 0.15s ease',
                              outline: 'none',
                            }}
                          >
                            <span>
                              {allKnownCategories.find((c) => c.id === formData.category_id || c.slug === formData.category_id)?.name || 'Select Category'}
                            </span>
                            <i
                              className="fa-solid fa-chevron-down"
                              style={{
                                fontSize: '11px',
                                color: isCatDropdownOpen ? 'var(--color-primary, #b45309)' : '#94A3B8',
                                transform: isCatDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease',
                              }}
                            />
                          </button>

                          {/* Custom Dropdown Menu */}
                          {isCatDropdownOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                left: 0,
                                right: 0,
                                background: '#ffffff',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                                zIndex: 100,
                                padding: '6px',
                                maxHeight: '220px',
                                overflowY: 'auto',
                              }}
                            >
                              {allKnownCategories.map((c) => {
                                const isSelected = formData.category_id === c.id || formData.category_id === c.slug;
                                return (
                                  <button
                                    key={c.id || c.slug}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, category_id: c.id || c.slug }));
                                      setIsCatDropdownOpen(false);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: '7px',
                                      border: 'none',
                                      background: isSelected ? '#FAF6F0' : 'transparent',
                                      color: isSelected ? 'var(--color-primary, #b45309)' : '#334155',
                                      fontWeight: isSelected ? '700' : '600',
                                      fontSize: '12.5px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      textAlign: 'left',
                                      transition: 'background 0.12s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <span>{c.name}</span>
                                    {isSelected && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: 'var(--color-primary, #b45309)' }}></i>}
                                  </button>
                                );
                              })}

                              <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0' }} />

                              <button
                                type="button"
                                onClick={() => {
                                  setIsCatDropdownOpen(false);
                                  setIsAddingNewCat(true);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '7px',
                                  border: 'none',
                                  background: '#F8FAFC',
                                  color: 'var(--color-primary, #b45309)',
                                  fontWeight: '700',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  textAlign: 'left',
                                }}
                              >
                                <i className="fa-solid fa-plus" style={{ fontSize: '10.5px' }}></i>
                                <span>Add New Category...</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setIsCatDropdownOpen(false);
                                  setIsManageCategoriesOpen(true);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '7px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#64748b',
                                  fontWeight: '700',
                                  fontSize: '11.5px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#F8FAFC';
                                  e.currentTarget.style.color = 'var(--color-primary, #b45309)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#64748b';
                                }}
                              >
                                <i className="fa-solid fa-gear" style={{ fontSize: '10.5px' }}></i>
                                <span>Manage Categories...</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsAddingNewCat(true)}
                          style={{
                            height: '38px',
                            padding: '0 14px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            borderRadius: '9px',
                            border: '1.5px solid #E2E8F0',
                            background: '#F8FAFC',
                            fontWeight: '700',
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F1F5F9';
                            e.currentTarget.style.borderColor = '#CBD5E1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8FAFC';
                            e.currentTarget.style.borderColor = '#E2E8F0';
                          }}
                        >
                          <i className="fa-solid fa-plus" style={{ fontSize: '11px', color: 'var(--color-primary, #b45309)' }}></i>
                          <span>New</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Type new category name..."
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1,
                            height: '38px',
                            padding: '0 12px',
                            borderRadius: '9px',
                            border: '1.5px solid var(--color-primary, #b45309)',
                            background: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '600',
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateNewCategory}
                          style={{
                            height: '38px',
                            padding: '0 14px',
                            fontSize: '12px',
                            borderRadius: '9px',
                            fontWeight: '800',
                            background: 'var(--color-primary, #b45309)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <i className="fa-solid fa-check" style={{ fontSize: '11px' }}></i>
                          <span>Add</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewCat(false)}
                          style={{
                            height: '38px',
                            padding: '0 12px',
                            fontSize: '12px',
                            borderRadius: '9px',
                            border: '1.5px solid #E2E8F0',
                            background: '#F1F5F9',
                            color: '#64748B',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Description
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Handcrafted details, materials, and care instructions..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        border: '1.5px solid #E2E8F0',
                        background: '#F8FAFC',
                        fontSize: '12.5px',
                        lineHeight: '1.5',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Pricing & Discounts */}
              <div className="card" style={{ padding: '20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-tags" style={{ color: 'var(--color-primary, #b45309)', fontSize: '13.5px' }}></i>
                  <span>Pricing & Discounts</span>
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Base Price */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Base Regular Price <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#64748B', fontSize: '13.5px' }}>₱</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder="0.00"
                        value={formData.base_price || ''}
                        onChange={(e) => handleBasePriceChange(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          height: '38px',
                          paddingLeft: '30px',
                          paddingRight: '12px',
                          borderRadius: '9px',
                          border: '1.5px solid #E2E8F0',
                          background: '#F8FAFC',
                          fontSize: '14px',
                          fontWeight: '800',
                          color: '#0F172A',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* Promotional Sale Toggle Card */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: formData.is_on_sale ? '1.5px solid #FECACA' : '1px solid #E2E8F0',
                    background: formData.is_on_sale ? '#FEF2F2' : '#F8FAFC',
                    transition: 'all 0.15s ease',
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      margin: 0,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={formData.is_on_sale}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData((prev) => {
                              const baseNum = parseFloat(prev.base_price) || 0;
                              const saleNum = parseFloat(prev.sale_price) || 0;
                              let newTag = prev.sale_tag;
                              if (isChecked && baseNum > 0 && saleNum > 0 && saleNum < baseNum) {
                                const percent = Math.round(((baseNum - saleNum) / baseNum) * 100);
                                newTag = `${percent}% OFF`;
                              }
                              return { ...prev, is_on_sale: isChecked, sale_tag: newTag };
                            });
                          }}
                          style={{ width: '16px', height: '16px', accentColor: '#dc2626', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: formData.is_on_sale ? '#991B1B' : '#334155' }}>
                          On Sale / Discount
                        </span>
                      </div>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        color: formData.is_on_sale ? '#DC2626' : '#64748B',
                        background: formData.is_on_sale ? '#FEE2E2' : '#E2E8F0',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        letterSpacing: '0.03em',
                      }}>
                        {formData.is_on_sale ? 'ACTIVE' : 'OFF'}
                      </span>
                    </label>

                    {/* Expandable Sale Price & Calculated Discount */}
                    {formData.is_on_sale && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #FEE2E2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#991B1B', marginBottom: '5px' }}>
                            Sale Price <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#DC2626', fontSize: '13px' }}>₱</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="form-input"
                              placeholder="0.00"
                              value={formData.sale_price !== 0 && formData.sale_price !== '0' ? formData.sale_price : ''}
                              onChange={(e) => handleSalePriceChange(e.target.value)}
                              style={{
                                width: '100%',
                                height: '38px',
                                paddingLeft: '30px',
                                paddingRight: '12px',
                                borderRadius: '9px',
                                border: '1.5px solid #FCA5A5',
                                background: '#FFFFFF',
                                fontSize: '13.5px',
                                fontWeight: '800',
                                color: '#991B1B',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>

                        {/* Calculated Savings & Discount Indicator */}
                        {parseFloat(formData.base_price) > 0 && parseFloat(formData.sale_price) > 0 && parseFloat(formData.sale_price) < parseFloat(formData.base_price) ? (
                          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#166534', background: '#DCFCE7', padding: '7px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-solid fa-tag"></i>
                              <span>
                                Discount: <strong>{Math.round(((parseFloat(formData.base_price) - parseFloat(formData.sale_price)) / parseFloat(formData.base_price)) * 100)}% OFF</strong>
                              </span>
                            </div>
                            <span style={{ fontWeight: '800' }}>
                              Saves ₱{(parseFloat(formData.base_price) - parseFloat(formData.sale_price)).toFixed(2)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Store Badges & Inventory (Clean 3-Column Grid) */}
              <div className="card" style={{ padding: '20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-boxes-stacked" style={{ color: 'var(--color-primary, #b45309)', fontSize: '13.5px' }}></i>
                  <span>Store Badges & Inventory</span>
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {/* Available in Store */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid ' + (formData.is_available ? '#BBF7D0' : '#E2E8F0'),
                    background: formData.is_available ? '#F0FDF4' : '#F8FAFC',
                    cursor: 'pointer',
                    minHeight: '42px',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: formData.is_available ? '#166534' : '#334155' }}>
                      Available in Store
                    </span>
                  </label>

                  {/* Bestseller Badge */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid ' + (formData.is_bestseller ? '#FED7AA' : '#E2E8F0'),
                    background: formData.is_bestseller ? '#FFFBEB' : '#F8FAFC',
                    cursor: 'pointer',
                    minHeight: '42px',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.is_bestseller}
                      onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#d97706', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: formData.is_bestseller ? '#92400E' : '#334155' }}>
                      Bestseller
                    </span>
                  </label>

                  {/* On-Hand Stock */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid ' + (formData.is_ready_made ? '#BBF7D0' : '#E2E8F0'),
                    background: formData.is_ready_made ? '#F0FDF4' : '#F8FAFC',
                    minHeight: '42px',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={formData.is_ready_made}
                        onChange={(e) => setFormData({ ...formData, is_ready_made: e.target.checked })}
                        style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: formData.is_ready_made ? '#166534' : '#334155' }}>
                        On-Hand
                      </span>
                    </label>
                    {formData.is_ready_made && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={formData.ready_made_stock}
                          onChange={(e) => setFormData({ ...formData, ready_made_stock: e.target.value })}
                          style={{
                            width: '50px',
                            height: '26px',
                            padding: '0 4px',
                            borderRadius: '6px',
                            border: Number(formData.ready_made_stock) === 0 ? '1.5px solid #FCA5A5' : '1.5px solid #86EFAC',
                            fontSize: '12px',
                            background: '#ffffff',
                            fontWeight: '800',
                            color: Number(formData.ready_made_stock) === 0 ? '#DC2626' : '#166534',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {formData.is_ready_made && Number(formData.ready_made_stock) === 0 && (
                  <p style={{ margin: '8px 0 0', fontSize: '11px', fontWeight: '600', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '10px' }}></i>
                    <span>Stock is 0 — item will appear as &quot;Sold Out&quot; in store.</span>
                  </p>
                )}
              </div>

              {/* Card 4: Customization Options */}
              <div className="card" style={{ padding: '20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-sliders" style={{ color: 'var(--color-primary, #b45309)', fontSize: '13.5px' }}></i>
                    <span>Customization Options ({formData.product_options.length})</span>
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddOptionGroup}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      borderRadius: '8px',
                      border: '1.5px solid #E2E8F0',
                      background: '#F8FAFC',
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F1F5F9';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <i className="fa-solid fa-plus" style={{ fontSize: '10.5px', color: 'var(--color-primary, #b45309)' }}></i>
                    <span>Add Group</span>
                  </button>
                </div>

                {formData.product_options.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '18px', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', fontWeight: '500' }}>No customization option groups configured</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {formData.product_options.map((opt, optIdx) => (
                      <div key={opt.id || optIdx} style={{ padding: '14px', background: '#FAF6F0', borderRadius: '10px', border: '1px solid #EADDC9' }}>
                        {/* Group Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <input
                            type="text"
                            value={opt.option_name}
                            onChange={(e) => handleUpdateOptionGroupName(opt.id, e.target.value)}
                            placeholder="Group Name (e.g. Color Theme)"
                            style={{
                              flex: 1,
                              height: '34px',
                              padding: '0 10px',
                              borderRadius: '8px',
                              border: '1px solid #D8C4AA',
                              fontSize: '12.5px',
                              fontWeight: '700',
                              background: '#FFFFFF',
                              color: '#0F172A',
                              boxSizing: 'border-box',
                            }}
                          />
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            color: opt.is_required ? '#92400E' : '#475569',
                            background: opt.is_required ? '#FEF3C7' : '#FFFFFF',
                            border: '1px solid ' + (opt.is_required ? '#FDE68A' : '#D8C4AA'),
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            height: '34px',
                            boxSizing: 'border-box',
                          }}>
                            <input
                              type="checkbox"
                              checked={opt.is_required}
                              onChange={() => handleToggleOptionRequired(opt.id)}
                              style={{ width: '14px', height: '14px', accentColor: '#d97706', cursor: 'pointer' }}
                            />
                            <span>Required</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteOptionGroup(opt.id)}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: '1px solid #FECACA',
                              background: '#FFFFFF',
                              color: '#DC2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FEE2E2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FFFFFF';
                            }}
                            title="Delete Option Group"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>

                        {/* Choices List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(opt.choices || []).map((ch, chIdx) => (
                            <div key={chIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder="Choice Label (e.g. Pastel Pink)"
                                value={ch.label}
                                onChange={(e) => handleUpdateChoice(opt.id, chIdx, 'label', e.target.value)}
                                style={{
                                  flex: 1,
                                  height: '32px',
                                  padding: '0 10px',
                                  borderRadius: '7px',
                                  border: '1px solid #D8C4AA',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  background: '#FFFFFF',
                                  color: '#0F172A',
                                  boxSizing: 'border-box',
                                }}
                              />
                              <div style={{ position: 'relative', width: '90px' }}>
                                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#64748B', fontWeight: '800' }}>+₱</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={ch.extra_cost || ''}
                                  onChange={(e) => handleUpdateChoice(opt.id, chIdx, 'extra_cost', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '32px',
                                    paddingLeft: '24px',
                                    paddingRight: '6px',
                                    borderRadius: '7px',
                                    border: '1px solid #D8C4AA',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    background: '#FFFFFF',
                                    color: '#0F172A',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteChoice(opt.id, chIdx)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  transition: 'all 0.12s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#FEE2E2';
                                  e.currentTarget.style.color = '#DC2626';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#94A3B8';
                                }}
                                title="Remove Choice"
                              >
                                ✕
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddChoice(opt.id)}
                            style={{
                              marginTop: '4px',
                              alignSelf: 'flex-start',
                              height: '28px',
                              padding: '0 10px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              borderRadius: '6px',
                              border: '1px dashed #B45309',
                              background: '#FFFFFF',
                              color: 'var(--color-primary, #b45309)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FAF6F0';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FFFFFF';
                            }}
                          >
                            <i className="fa-solid fa-plus" style={{ fontSize: '9.5px' }}></i>
                            <span>Add Choice</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: Photos Gallery & Live Storefront Preview (Sticky on Desktop) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '76px', alignSelf: 'start' }}>
              
              {/* Card 4: Photos Gallery */}
              <div className="card" style={{ padding: '20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-images" style={{ color: 'var(--color-primary, #b45309)', fontSize: '13.5px' }}></i>
                  <span>Product Gallery ({formData.product_photos.length})</span>
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

                {/* Photo List with Golden Cover Highlight & Zoom */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '8px' }}>
                  {formData.product_photos.map((ph) => (
                    <div
                      key={ph.id}
                      onClick={() => setZoomedPhotoUrl(ph.url)}
                      title="Click to zoom photo"
                      style={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        height: '75px',
                        background: '#f8fafc',
                        border: ph.is_cover ? '2.5px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
                        boxShadow: ph.is_cover ? '0 0 0 2px rgba(180,83,9,0.25)' : 'none',
                        cursor: 'zoom-in',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.url} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

                      {ph.is_cover && (
                        <span style={{ position: 'absolute', top: '2px', left: '2px', background: 'var(--color-primary, #b45309)', color: '#fff', fontSize: '8px', fontWeight: '800', padding: '1px 4px', borderRadius: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                          ★ COVER
                        </span>
                      )}

                      <div
                        style={{ position: 'absolute', bottom: '2px', right: '2px', display: 'flex', gap: '2px', zIndex: 3 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!ph.is_cover && (
                          <button
                            type="button"
                            onClick={() => handleSetCoverPhoto(ph.id)}
                            title="Set as Main Cover"
                            style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 5px', fontSize: '8px', cursor: 'pointer', fontWeight: '700' }}
                          >
                            Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(ph.id)}
                          title="Delete photo"
                          style={{ background: 'rgba(220,38,38,0.88)', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 5px', fontSize: '8px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5: Storefront Preview (Maximized & Clear) */}
              <div className="card" style={{ padding: '20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-eye" style={{ color: 'var(--color-primary, #b45309)', fontSize: '13.5px' }}></i>
                    <span>Storefront Live Preview</span>
                  </h2>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0369A1', background: '#E0F2FE', padding: '2px 8px', borderRadius: '6px' }}>
                    Customer View
                  </span>
                </div>

                <div style={{
                  width: '100%',
                  background: '#FAFAF9',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.04)',
                }}>
                  {/* Image area */}
                  <div style={{ position: 'relative', width: '100%', height: '240px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPhotoPreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    {/* Badges on photo */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 2 }}>
                      {formData.is_bestseller && (
                        <span style={{ fontSize: '10px', fontWeight: '800', background: '#FFEDD5', color: '#C2410C', padding: '3px 8px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                          ⭐ Bestseller
                        </span>
                      )}
                      {formData.is_ready_made && (
                        <span style={{ fontSize: '10px', fontWeight: '800', background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                          🌿 On-Hand ({formData.ready_made_stock || 0})
                        </span>
                      )}
                      {formData.is_on_sale && (
                        <span style={{ fontSize: '10px', fontWeight: '800', background: '#FEE2E2', color: '#B91C1C', padding: '3px 8px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                          🔥 {formData.sale_tag || 'Sale'}
                        </span>
                      )}
                      {formData.is_sold_out && (
                        <span style={{ fontSize: '10px', fontWeight: '800', background: '#1E293B', color: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Body */}
                  <div style={{ padding: '16px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary, #b45309)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {allKnownCategories.find((c) => c.id === formData.category_id || c.slug === formData.category_id)?.name || 'Crafts'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>
                        {formData.product_options?.length || 0} option{formData.product_options?.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '800', color: '#0F172A', lineHeight: 1.3 }}>
                      {formData.name || 'Handmade Craft Piece'}
                    </h3>

                    {formData.description ? (
                      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748B', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {formData.description}
                      </p>
                    ) : (
                      <p style={{ margin: '0 0 12px', fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                        No description provided yet.
                      </p>
                    )}

                    {/* Price and Add to Cart Preview */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '17px', fontWeight: '900', color: 'var(--color-primary, #b45309)' }}>
                            {formatCurrency(formData.is_on_sale && formData.sale_price ? formData.sale_price : formData.base_price)}
                          </span>
                          {formData.is_on_sale && Boolean(formData.sale_price) && parseFloat(formData.base_price) > 0 && (
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8', textDecoration: 'line-through' }}>
                              {formatCurrency(formData.base_price)}
                            </span>
                          )}
                        </div>
                        {formData.is_on_sale && Boolean(formData.sale_price) && parseFloat(formData.base_price) > parseFloat(formData.sale_price) && (
                          <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#166534', display: 'block', marginTop: '1px' }}>
                            Save ₱{(parseFloat(formData.base_price) - parseFloat(formData.sale_price)).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div style={{
                        background: 'var(--color-primary, #b45309)',
                        color: '#FFFFFF',
                        padding: '7px 13px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(180,83,9,0.2)',
                      }}>
                        <i className="fa-solid fa-cart-shopping" style={{ fontSize: '10.5px' }}></i>
                        <span>Add to Cart</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Floating Sticky Quick-Save Action Bar */}
          <div
            className="floating-save-dock"
            style={{
              position: 'sticky',
              bottom: '18px',
              zIndex: 100,
              marginTop: '28px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '16px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 20px 35px -10px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              animation: 'adminModalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: editingProduct ? 'rgba(180, 83, 9, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  color: editingProduct ? 'var(--color-primary, #b45309)' : '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                <i className={editingProduct ? 'fa-solid fa-pen-nib' : 'fa-solid fa-sparkles'}></i>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                    {editingProduct ? 'Editing Product' : 'New Product Draft'}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 7px',
                      borderRadius: '9999px',
                      background: formData.is_available !== false ? '#DCFCE7' : '#F1F5F9',
                      color: formData.is_available !== false ? '#166534' : '#64748B',
                    }}
                  >
                    {formData.is_available !== false ? 'Active' : 'Draft / Inactive'}
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editingProduct
                    ? (formData.name ? `"${formData.name}"` : 'Update details and save')
                    : (formData.name ? `"${formData.name}"` : 'Configure your product info and publish')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  scrollToTop();
                }}
                className="btn btn-secondary btn-sm"
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.color = '#0F172A';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: '11.5px' }}></i>
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-sm"
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '12.5px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
                  color: '#FFFFFF',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(180, 83, 9, 0.28)',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: saving ? 0.75 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(180, 83, 9, 0.38)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(180, 83, 9, 0.28)';
                  }
                }}
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '12px' }}></i>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className={editingProduct ? 'fa-solid fa-check' : 'fa-solid fa-plus'} style={{ fontSize: '12px' }}></i>
                    <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lightbox Zoom Modal for Product Gallery */}
      {zoomedPhotoUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
          onClick={() => setZoomedPhotoUrl(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '650px',
              maxHeight: '85vh',
              background: '#0F172A',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedPhotoUrl}
              alt="Zoomed Photo"
              style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain' }}
            />
            <button
              type="button"
              onClick={() => setZoomedPhotoUrl(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '800',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
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
          onClick={() => setProductToDelete(null)}
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
              Delete Product?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong style={{ color: '#0f172a' }}>{productToDelete.name}</strong> from your catalog?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  borderRadius: '999px',
                  border: '1px solid #e2e8f0',
                  background: '#f1f5F9',
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

      {/* ══════════════════════════════════════════════════════════════
          MODAL: MANAGE CATEGORIES (ADD, EDIT / RENAME, DELETE)
         ══════════════════════════════════════════════════════════════ */}
      {isManageCategoriesOpen && (
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
            zIndex: 999998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            animation: 'adminModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => {
            setIsManageCategoriesOpen(false);
            setEditingCatId(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #f1f5f9',
              boxSizing: 'border-box',
              animation: 'adminModalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-layer-group" style={{ color: 'var(--color-primary, #b45309)', fontSize: '16px' }}></i>
                <span>Manage Categories</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setEditingCatId(null);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Add Bar */}
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              background: '#FAF6F0',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #EADDC9',
              transition: 'all 0.2s ease',
            }}>
              <input
                type="text"
                placeholder="New category name (e.g. Mini Bouquets)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateNewCategory();
                  }
                }}
                style={{
                  flex: 1,
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary, #b45309)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(180, 83, 9, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => handleCreateNewCategory()}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--color-primary, #b45309)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <i className="fa-solid fa-plus" style={{ fontSize: '11px' }}></i>
                <span>Add</span>
              </button>
            </div>

            {/* Categories List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '2px',
              minHeight: '180px',
              maxHeight: '380px',
            }}>
              {allKnownCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}></i>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>No categories found</p>
                </div>
              ) : (
                allKnownCategories.map((c) => {
                  const isEditing = editingCatId === c.id || editingCatId === c.slug;
                  const catId = c.id || c.slug;
                  const count = products.filter((p) => {
                    const pCatSlug = (p.category?.slug || p.category?.name || p.category_id || '').toString().toLowerCase();
                    const pCatId = (p.category?.id || p.category_id || '').toString().toLowerCase();
                    const target = (c.slug || c.id || c.name || '').toString().toLowerCase();
                    return pCatSlug === target || pCatId === target || (p.category?.name && p.category.name.toLowerCase() === target);
                  }).length;

                  return (
                    <div
                      key={catId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isEditing ? '#FAF6F0' : '#f8fafc',
                        border: isEditing ? '1.5px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
                        gap: '10px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isEditing) {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isEditing) {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleUpdateCategory(c.id || c.slug, editingCatName);
                              } else if (e.key === 'Escape') {
                                setEditingCatId(null);
                                setEditingCatName('');
                              }
                            }}
                            style={{
                              flex: 1,
                              height: '34px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              border: '1.5px solid var(--color-primary, #b45309)',
                              fontSize: '12.5px',
                              fontWeight: '700',
                              color: '#0f172a',
                              background: '#ffffff',
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCategory(c.id || c.slug, editingCatName)}
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#16a34a',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                            title="Save Rename"
                          >
                            <i className="fa-solid fa-check"></i>
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(null);
                              setEditingCatName('');
                            }}
                            style={{
                              height: '34px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#64748b',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                            <i className="fa-regular fa-folder" style={{ color: 'var(--color-primary, #b45309)', fontSize: '14px', flexShrink: 0 }}></i>
                            <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.name}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#64748b',
                              background: '#e2e8f0',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              flexShrink: 0,
                            }}>
                              {count} {count === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(c.id || c.slug);
                                setEditingCatName(c.name);
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12.5px',
                                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f1f5f9';
                                e.currentTarget.style.color = '#0f172a';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.color = '#475569';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.transform = 'none';
                              }}
                              title="Rename Category"
                            >
                              <i className="fa-regular fa-pen-to-square"></i>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCatToDelete(c)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                background: '#ffffff',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12.5px',
                                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fef2f2';
                                e.currentTarget.style.borderColor = '#fca5a5';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = '#fecaca';
                                e.currentTarget.style.transform = 'none';
                              }}
                              title="Delete Category"
                            >
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setEditingCatId(null);
                }}
                className="btn btn-secondary btn-sm"
                style={{
                  height: '36px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: DELETE CATEGORY CONFIRMATION
         ══════════════════════════════════════════════════════════════ */}
      {catToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={() => setCatToDelete(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              margin: '0 auto 14px',
            }}>
              <i className="fa-regular fa-trash-can"></i>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              Delete Category &quot;{catToDelete.name}&quot;?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to delete this category? Any existing products assigned to this category will remain safe in your store and be marked as <strong style={{ color: '#0f172a' }}>Unassigned</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
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
                onClick={() => handleDeleteCategory(catToDelete)}
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
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
