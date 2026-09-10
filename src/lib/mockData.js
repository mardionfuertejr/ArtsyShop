/**
 * LIKHA Mock Data Layer
 * Clean baseline ready for real store & admin inputs.
 */

export const MOCK_CATEGORIES = [];

export const MOCK_PRODUCTS = [];

export const MOCK_ORDERS = [];

export const MOCK_MATERIALS = [];

export const MOCK_CUSTOM_REQUESTS = [];

export const MOCK_REVIEWS = [];

export const MOCK_FEEDBACKS = [];

// In-memory storage for active session submissions
let localReviews = [...MOCK_REVIEWS];
let localFeedbacks = [...MOCK_FEEDBACKS];
let localProducts = [...MOCK_PRODUCTS];
let localOrders = [...MOCK_ORDERS];

export function getMockReviewsByProductSlug(slug) {
  return localReviews.filter((r) => r.productSlug === slug && r.is_approved !== false);
}

export function getAllMockReviews() {
  return localReviews;
}

export function deleteMockReview(id) {
  localReviews = localReviews.filter((r) => r.id !== id);
  return localReviews;
}

export function toggleMockReviewApproval(id) {
  localReviews = localReviews.map((r) => {
    if (r.id === id) {
      return { ...r, is_approved: r.is_approved === false ? true : false };
    }
    return r;
  });
  return localReviews;
}

export function addMockReview(review) {
  const newReview = {
    id: `rev-${Date.now()}`,
    is_verified_buyer: true,
    is_approved: true,
    created_at: new Date().toISOString(),
    ...review,
  };
  localReviews = [newReview, ...localReviews];
  return newReview;
}

export function getMockFeedbacks() {
  return localFeedbacks;
}

export function deleteMockFeedback(id) {
  localFeedbacks = localFeedbacks.filter((f) => f.id !== id);
  return localFeedbacks;
}

export function addMockFeedback(feedback) {
  const newFeedback = {
    id: `fb-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...feedback,
  };
  localFeedbacks = [newFeedback, ...localFeedbacks];
  return newFeedback;
}

export function getMockProducts(categorySlug = 'all') {
  let list = [...localProducts];
  if (categorySlug && categorySlug !== 'all') {
    if (categorySlug === 'ready-made') {
      list = list.filter((p) => p.is_ready_made);
    } else {
      list = list.filter((p) => p.category?.slug === categorySlug);
    }
  }

  // Always sort available/in-stock first, all sold out products to the end
  return list.sort((a, b) => {
    const aSold = Boolean(a.is_sold_out || (a.is_ready_made && a.ready_made_stock === 0));
    const bSold = Boolean(b.is_sold_out || (b.is_ready_made && b.ready_made_stock === 0));
    if (aSold && !bSold) return 1;
    if (!aSold && bSold) return -1;
    return (a.display_order || 99) - (b.display_order || 99);
  });
}

export function getMockReadyMadeProducts() {
  return localProducts.filter((p) => p.is_ready_made);
}

export function getMockProductBySlug(slug) {
  return localProducts.find((p) => p.slug === slug) || null;
}

export function saveMockProduct(productData) {
  const existingIdx = localProducts.findIndex((p) => p.id === productData.id);
  if (existingIdx >= 0) {
    localProducts[existingIdx] = { ...localProducts[existingIdx], ...productData };
    return localProducts[existingIdx];
  } else {
    const newProd = {
      id: productData.id || `prod-${Date.now()}`,
      display_order: localProducts.length + 1,
      ...productData,
    };
    localProducts = [newProd, ...localProducts];
    return newProd;
  }
}

export function deleteMockProduct(productId) {
  localProducts = localProducts.filter((p) => p.id !== productId);
  return true;
}

export function getMockCategories() {
  return MOCK_CATEGORIES;
}

export function addMockOrder(orderData) {
  const newOrder = {
    id: `ord-${Date.now()}`,
    status: 'pending',
    created_at: new Date().toISOString(),
    ...orderData,
  };
  localOrders = [newOrder, ...localOrders];
  return newOrder;
}

export function getAllMockOrders() {
  return localOrders;
}

export function getMockOrderByReference(refCode) {
  if (!refCode) return null;
  const clean = refCode.trim().toUpperCase();
  return (
    localOrders.find((o) => {
      const oRef = o.reference_code?.toUpperCase() || '';
      return (
        oRef === clean ||
        oRef.replace(/^LK-/, 'M&M-') === clean ||
        oRef.replace(/^M&M-/, 'LK-') === clean
      );
    }) || null
  );
}

export function getMockDashboardData() {
  const lowStock = MOCK_MATERIALS.filter((m) => m.current_stock <= m.minimum_stock);
  const pendingOrders = localOrders.filter((o) => ['pending', 'for_confirmation'].includes(o.status));
  const completedOrders = localOrders.filter((o) => o.status === 'completed');

  const monthRevenue = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const monthCOGS = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_cost) || 0), 0);
  const monthProfit = monthRevenue - monthCOGS;

  return {
    monthRevenue,
    monthProfit,
    pendingCount: pendingOrders.length,
    lowStockCount: lowStock.length,
    pendingCustomRequests: MOCK_CUSTOM_REQUESTS.filter((r) => r.status === 'pending').length,
    lowStockMaterials: lowStock,
    recentOrders: localOrders.slice(0, 5),
  };
}
