'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PremiumDatePicker, { isRushDate } from '@/components/common/PremiumDatePicker';
import PremiumTimePicker from '@/components/common/PremiumTimePicker';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { generateOrderReference } from '@/lib/engine/reference';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { addMockOrder } from '@/lib/mockData';
import { resolveAccurateAddress, REAL_LANDMARKS, findClosestLandmark } from '@/lib/utils/landmarkResolver';
import {
  getVoucherWallet,
  getBestApplicableVoucher,
  getActiveVoucher,
  validateVoucherAgainstSubtotal,
  markVoucherAsUsed,
  isVoucherExpired,
} from '@/lib/engine/voucherEngine';

const DEFAULT_DELIVERY_FEE = 45;
const BARUGO_STUDIO_COORDS = { lat: 11.3256, lng: 124.7349 };

// Haversine formula to compute great-circle distance in kilometers
function computeDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateDynamicDeliveryFee(settings, deliveryLocation, orderType) {
  if (orderType === 'pickup') return 0;
  
  if (settings.delivery_fee_mode === 'fixed') {
    return parseFloat(settings.delivery_fee) || DEFAULT_DELIVERY_FEE;
  }

  const nearFee = parseFloat(settings.delivery_fee_near) || 20; // 0-2 km (Poblacion)
  const midFee = parseFloat(settings.delivery_fee_mid) || 35;   // 2-5 km (Barangays)
  const farFee = parseFloat(settings.delivery_fee_far) || 45;   // 5+ km (Carigara/Max)

  if (!deliveryLocation || !deliveryLocation.lat || !deliveryLocation.lng) {
    return nearFee;
  }

  const shopLat = parseFloat(settings.studio_lat || settings.studioLat) || BARUGO_STUDIO_COORDS.lat;
  const shopLng = parseFloat(settings.studio_lng || settings.studioLng) || BARUGO_STUDIO_COORDS.lng;

  const distKm = computeDistanceKm(
    shopLat,
    shopLng,
    deliveryLocation.lat,
    deliveryLocation.lng
  );

  if (distKm > 5) return farFee;
  if (distKm > 2) return midFee;
  return nearFee;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, removeItems } = useCart();
  const [directItem, setDirectItem] = useState(null);
  const [isDirectCheckout, setIsDirectCheckout] = useState(false);
  const [selectedIds, setSelectedIds] = useState(null);
  const [orderType, setOrderType] = useState('delivery');
  const [formData, setFormData] = useState({ name: '', phone: '', facebookName: '', notes: '', preferredDate: '', preferredTime: '' });
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [settings, setSettings] = useState({
    pickup_address: '',
    pickup_notes: '',
    delivery_fee: DEFAULT_DELIVERY_FEE,
    delivery_fee_mode: 'auto',
    delivery_fee_near: 20,
    delivery_fee_mid: 35,
    delivery_fee_far: 45,
    rush_fee_enabled: true,
    rush_fee_amount: 50,
  });
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Load direct buy now item OR selected items passed from cart
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = "Checkout | M&M's Artsy";
    }
    try {
      const direct = localStorage.getItem('likha_direct_checkout_item');
      if (direct) {
        const parsed = JSON.parse(direct);
        if (parsed && parsed.productName) {
          setDirectItem(parsed);
          setIsDirectCheckout(true);
          return;
        }
      }

      const stored = localStorage.getItem('likha_checkout_items');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedIds(parsed);
        }
      }
    } catch {}
  }, []);

  // Filter items to checkout
  const checkoutCart = isDirectCheckout && directItem
    ? [directItem]
    : (selectedIds && selectedIds.length > 0
        ? cart.filter((item) => selectedIds.includes(item.cartItemId))
        : cart);

  const subtotal = checkoutCart.reduce((sum, c) => {
    return sum + (parseFloat(c.unitPrice) || 0) * (c.quantity || 1);
  }, 0);

  const totalPieces = checkoutCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const dynamicDeliveryFee = calculateDynamicDeliveryFee(settings, deliveryLocation, orderType);

  // Voucher / Promo Code State
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [walletVouchers, setWalletVouchers] = useState([]);

  // Load wallet and auto-apply best eligible voucher matching current subtotal
  useEffect(() => {
    try {
      const wallet = getVoucherWallet();
      setWalletVouchers(wallet);

      const best = getBestApplicableVoucher(subtotal);
      if (best) {
        // If best is eligible for current subtotal, auto-apply it!
        if (subtotal >= (best.minSpend || 0)) {
          setAppliedVoucher(best);
          setVoucherInput(best.code);
        } else {
          // Keep as selected reference
          setVoucherInput(best.code);
        }
      }
    } catch {}
  }, [subtotal]);

  const handleApplyVoucher = (e) => {
    if (e) e.preventDefault();
    setVoucherError('');
    const cleanCode = (voucherInput || '').trim().toUpperCase();
    if (!cleanCode) return;

    // Check if code matches any voucher in customer's wallet
    const wallet = getVoucherWallet();
    const matched = wallet.find((v) => v.code === cleanCode);
    if (matched) {
      const validation = validateVoucherAgainstSubtotal(matched, subtotal);
      if (!validation.valid) {
        setVoucherError(validation.reason);
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(
              new CustomEvent('likha_toast', {
                detail: {
                  type: 'error',
                  title: 'Voucher Requirement ⚠️',
                  message: validation.reason,
                  duration: 3500,
                },
              })
            );
          } catch {}
        }
        return;
      }
      setAppliedVoucher(matched);
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('likha_toast', {
              detail: {
                type: 'success',
                title: 'Promo Applied! 🏷️',
                message: `Discount of ₱${matched.discount} applied to your order`,
                duration: 3000,
              },
            })
          );
        } catch {}
      }
      return;
    }

    // Check standard promo codes
    let newVoucher = null;
    if (cleanCode === 'ARTSYWINNER' || cleanCode.endsWith('-25') || cleanCode === 'MMARTSY25') {
      if (subtotal < 850) {
        const lacking = (850 - subtotal);
        const errMsg = `Min. spend ₱850 · Add ₱${lacking % 1 === 0 ? lacking.toFixed(0) : lacking.toFixed(2)} more`;
        setVoucherError(errMsg);
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('likha_toast', { detail: { type: 'error', title: 'Min. Spend Required ⚠️', message: errMsg, duration: 3500 } }));
          } catch {}
        }
        return;
      }
      newVoucher = {
        code: cleanCode,
        discount: 25,
        minSpend: 850,
        label: '₱25 OFF Masterpiece Artisan Voucher',
      };
    } else if (cleanCode === 'MMARTSY20' || cleanCode.endsWith('-20')) {
      if (subtotal < 600) {
        const lacking = (600 - subtotal);
        const errMsg = `Min. spend ₱600 · Add ₱${lacking % 1 === 0 ? lacking.toFixed(0) : lacking.toFixed(2)} more`;
        setVoucherError(errMsg);
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('likha_toast', { detail: { type: 'error', title: 'Min. Spend Required ⚠️', message: errMsg, duration: 3500 } }));
          } catch {}
        }
        return;
      }
      newVoucher = {
        code: cleanCode,
        discount: 20,
        minSpend: 600,
        label: '₱20 OFF Diamond Tier Voucher',
      };
    } else if (cleanCode === 'MMARTSY15' || cleanCode.endsWith('-15')) {
      if (subtotal < 450) {
        const lacking = (450 - subtotal);
        const errMsg = `Min. spend ₱450 · Add ₱${lacking % 1 === 0 ? lacking.toFixed(0) : lacking.toFixed(2)} more`;
        setVoucherError(errMsg);
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('likha_toast', { detail: { type: 'error', title: 'Min. Spend Required ⚠️', message: errMsg, duration: 3500 } }));
          } catch {}
        }
        return;
      }
      newVoucher = {
        code: cleanCode,
        discount: 15,
        minSpend: 450,
        label: '₱15 OFF Gold Tier Voucher',
      };
    } else if (cleanCode === 'MMARTSY10' || cleanCode.endsWith('-10')) {
      if (subtotal < 250) {
        const lacking = (250 - subtotal);
        const errMsg = `Min. spend ₱250 · Add ₱${lacking % 1 === 0 ? lacking.toFixed(0) : lacking.toFixed(2)} more`;
        setVoucherError(errMsg);
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('likha_toast', { detail: { type: 'error', title: 'Min. Spend Required ⚠️', message: errMsg, duration: 3500 } }));
          } catch {}
        }
        return;
      }
      newVoucher = {
        code: cleanCode,
        discount: 10,
        minSpend: 250,
        label: '₱10 OFF Silver Tier Voucher',
      };
    } else if (cleanCode === 'MMARTSY5' || cleanCode.endsWith('-5') || cleanCode === 'ARTSYLOVE5') {
      if (subtotal < 120) {
        const lacking = (120 - subtotal);
        const errMsg = `Min. spend ₱120 · Add ₱${lacking % 1 === 0 ? lacking.toFixed(0) : lacking.toFixed(2)} more`;
        setVoucherError(errMsg);
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('likha_toast', { detail: { type: 'error', title: 'Min. Spend Required ⚠️', message: errMsg, duration: 3500 } }));
          } catch {}
        }
        return;
      }
      newVoucher = {
        code: cleanCode,
        discount: 5,
        minSpend: 120,
        label: '₱5 OFF Starter Voucher',
      };
    } else {
      const errMsg = 'Invalid or expired promo code';
      setVoucherError(errMsg);
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('likha_toast', { detail: { type: 'error', title: 'Invalid Code ⚠️', message: errMsg, duration: 3000 } }));
        } catch {}
      }
      return;
    }

    if (newVoucher) {
      setAppliedVoucher(newVoucher);
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('likha_toast', {
              detail: {
                type: 'success',
                title: 'Promo Applied! 🏷️',
                message: `₱${newVoucher.discount} OFF successfully applied`,
                duration: 3000,
              },
            })
          );
        } catch {}
      }
    }
  };

  const handleSelectVoucherFromWallet = (voucher) => {
    setVoucherError('');
    setVoucherInput(voucher.code);
    const validation = validateVoucherAgainstSubtotal(voucher, subtotal);
    if (!validation.valid) {
      setVoucherError(validation.reason);
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('likha_toast', { detail: { type: 'error', title: 'Requirement Not Met ⚠️', message: validation.reason, duration: 3500 } }));
        } catch {}
      }
    } else {
      setAppliedVoucher(voucher);
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('likha_toast', { detail: { type: 'success', title: 'Voucher Applied! 🏷️', message: `₱${voucher.discount} OFF applied`, duration: 3000 } }));
        } catch {}
      }
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherError('');
  };

  // Re-validate applied voucher if cart changes
  const isVoucherApplicable = appliedVoucher && subtotal >= (appliedVoucher.minSpend || 0);
  const voucherDiscount = isVoucherApplicable ? (appliedVoucher.discount || 0) : 0;
  
  // Smart Rush Order Detection (Today & Tomorrow)
  const isRush = isRushDate(formData.preferredDate);
  const appliedRushFee = (isRush && settings.rush_fee_enabled !== false)
    ? (settings.rush_fee_amount !== undefined ? settings.rush_fee_amount : 50)
    : 0;

  const totalAmount = Math.max(0, subtotal + dynamicDeliveryFee + appliedRushFee - voucherDiscount);

  // Load business settings & saved customer info
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('likha_guest_info');
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        setFormData(prev => ({
          ...prev,
          name: parsed.name || '',
          phone: parsed.phone || '',
          facebookName: parsed.facebookName || '',
        }));
      }
    } catch {}

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data?.settings) {
          setSettings({
            pickup_address: data.settings.studioAddress || data.settings.pickup_address,
            pickup_notes: data.settings.pickup_notes || data.settings.pickupNotes || 'Pickup schedule and ready-for-pickup notice will be coordinated via Messenger.',
            studio_lat: data.settings.studioLat || data.settings.studio_lat,
            studio_lng: data.settings.studioLng || data.settings.studio_lng,
            delivery_fee: parseFloat(data.settings.deliveryFee) || DEFAULT_DELIVERY_FEE,
            delivery_fee_mode: data.settings.deliveryFeeMode || 'auto',
            delivery_fee_near: parseFloat(data.settings.deliveryFeeNear) || 20,
            delivery_fee_mid: parseFloat(data.settings.deliveryFeeMid) || 35,
            delivery_fee_far: parseFloat(data.settings.deliveryFeeFar) || 45,
            rush_fee_enabled: data.settings.rushFeeEnabled !== undefined ? data.settings.rushFeeEnabled : true,
            rush_fee_amount: data.settings.rushFeeAmount !== undefined ? parseFloat(data.settings.rushFeeAmount) : 50,
            gcash_name: data.settings.gcashName,
            gcash_number: data.settings.gcashNumber,
            studio_name: data.settings.studioName,
          });
          return;
        }
      } catch {}

      try {
        const local = localStorage.getItem('mm_studio_settings');
        if (local) {
          const parsed = JSON.parse(local);
          setSettings({
            pickup_address: parsed.studioAddress || parsed.pickup_address,
            pickup_notes: parsed.pickup_notes || parsed.pickupNotes || 'Pickup schedule and ready-for-pickup notice will be coordinated via Messenger.',
            studio_lat: parsed.studioLat || parsed.studio_lat,
            studio_lng: parsed.studioLng || parsed.studio_lng,
            delivery_fee: parseFloat(parsed.deliveryFee) || DEFAULT_DELIVERY_FEE,
            delivery_fee_mode: parsed.deliveryFeeMode || 'auto',
            delivery_fee_near: parseFloat(parsed.deliveryFeeNear) || 20,
            delivery_fee_mid: parseFloat(parsed.deliveryFeeMid) || 35,
            delivery_fee_far: parseFloat(parsed.deliveryFeeFar) || 45,
            rush_fee_enabled: parsed.rushFeeEnabled !== undefined ? parsed.rushFeeEnabled : true,
            rush_fee_amount: parsed.rushFeeAmount !== undefined ? parseFloat(parsed.rushFeeAmount) : 50,
            gcash_name: parsed.gcashName,
            gcash_number: parsed.gcashNumber,
            studio_name: parsed.studioName,
          });
          return;
        }
      } catch {}

      try {
        const supabase = createClient();
        if (supabase) {
          const { data } = await supabase.from('business_settings').select('*').single();
          if (data) {
            setSettings(prev => ({ ...prev, ...data }));
          }

          // Check if authenticated with Google / Supabase
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.user_metadata) {
            const fullName = user.user_metadata.full_name || user.user_metadata.name || '';
            const phone = user.user_metadata.phone || user.phone || '';
            if (fullName) {
              setFormData(prev => ({
                ...prev,
                name: prev.name || fullName,
                phone: prev.phone || phone,
              }));
              return;
            }
          }
        }
      } catch {
        // Fallback default settings
      }

      // Auto-fill from device memory (localStorage)
      try {
        const savedGuest = localStorage.getItem('likha_guest_info');
        if (savedGuest) {
          const parsed = JSON.parse(savedGuest);
          setFormData(prev => ({
            ...prev,
            name: prev.name || parsed.name || '',
            phone: prev.phone || parsed.phone || '',
            facebookName: prev.facebookName || parsed.facebookName || '',
          }));
        }
      } catch {}
    };
    loadSettings();
  }, []);

  const handleInputChange = (field, value) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      try {
        localStorage.setItem('likha_guest_info', JSON.stringify({
          name: updated.name,
          phone: updated.phone,
          facebookName: updated.facebookName,
        }));
      } catch {}
      return updated;
    });
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (orderType !== 'delivery') return;
    if (typeof window === 'undefined') return;

    // Reset ref to allow re-initialization when switching back to delivery
    let cancelled = false;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (cancelled) return;
      if (!mapRef.current) return;

      // If map already exists, just refresh it
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
      }

      // Default: Barugo Town Proper (Poblacion), Leyte
      const BARUGO_PROPER_COORDS = [11.3256, 124.7349];
      const map = L.map(mapRef.current, {
        center: BARUGO_PROPER_COORDS,
        zoom: 18,
        minZoom: 12,
        maxZoom: 21,
        zoomControl: true,
        attributionControl: false,
      });

      // Ultra-HD 2x Retina Google Satellite + Street Labels Hybrid Layer (Default Crystal Clear)
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&hl=en&scale=2&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        maxNativeZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        tileSize: 512,
        zoomOffset: -1,
        detectRetina: true,
      }).addTo(map);

      // High-visibility pinpoint icon with vibrant orange-terracotta glow
      const icon = L.divIcon({
        className: 'custom-map-pin',
        html: '<div style="color: #EA580C; font-size: 2.4rem; transform: translateY(-75%); filter: drop-shadow(0 4px 8px rgba(0,0,0,0.85)); display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-location-dot" style="-webkit-text-stroke: 2px #FFFFFF;"></i></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      // Helper: handle marker dragend reverse geocode
      const onMarkerDrag = (e) => {
        const pos = e.target.getLatLng();
        setDeliveryLocation({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      };

      // Auto-place initial pin at Barugo Proper
      const defaultMarker = L.marker(BARUGO_PROPER_COORDS, { icon, draggable: true }).addTo(map);
      markerRef.current = defaultMarker;
      setDeliveryLocation({ lat: BARUGO_PROPER_COORDS[0], lng: BARUGO_PROPER_COORDS[1] });
      if (!deliveryAddress) {
        setDeliveryAddress('Poblacion, Barugo, Leyte');
      }

      defaultMarker.on('dragend', onMarkerDrag);

      mapInstanceRef.current = map;

      // Store L and icon on the map ref for reuse in click/location handlers
      map._leafletLib = L;
      map._pinIcon = icon;
      map._onMarkerDrag = onMarkerDrag;

      // Ensure proper size calculation — multiple attempts for CSS transition delays
      const refreshSize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      setTimeout(refreshSize, 150);
      setTimeout(refreshSize, 400);
      setTimeout(refreshSize, 800);

      // Click anywhere to place / move pin
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        placePinAt(lat, lng);
      });
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  const [addressLoading, setAddressLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateStatus, setLocateStatus] = useState('');

  // High-accuracy reverse geocode & landmark resolver
  const reverseGeocode = async (lat, lng) => {
    setAddressLoading(true);
    try {
      const resolved = await resolveAccurateAddress(lat, lng);
      if (resolved) {
        setDeliveryAddress(resolved);
      }
    } catch {
      const fallback = findClosestLandmark(lat, lng);
      if (fallback && fallback.distanceMeters <= 45) {
        setDeliveryAddress(`Near ${fallback.name}, ${fallback.area}`);
      } else {
        setDeliveryAddress('Poblacion, Barugo, Leyte');
      }
    } finally {
      setAddressLoading(false);
    }
  };

  const placePinAt = (lat, lng) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const L = map._leafletLib;
    const icon = map._pinIcon;
    const onMarkerDrag = map._onMarkerDrag;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else if (L && icon) {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      if (onMarkerDrag) {
        markerRef.current.on('dragend', onMarkerDrag);
      }
    }
    if (fieldErrors.mapPin) {
      setFieldErrors(prev => ({ ...prev, mapPin: null }));
    }
    setDeliveryLocation({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateStatus('Pin on map');
      setError('Walang GPS. I-tap o i-drag ang pin sa mapa.');
      setTimeout(() => setLocateStatus(''), 3000);
      return;
    }

    setLocating(true);
    setLocateStatus('Locating...');
    setError('');

    let hasApplied = false;

    const applyLocation = (lat, lng, isFinal = true) => {
      hasApplied = true;
      const map = mapInstanceRef.current;
      if (map) {
        map.setView([lat, lng], 18, { animate: true });
        // Refresh map size after panning
        setTimeout(() => map.invalidateSize(), 200);
      }
      placePinAt(lat, lng);
      if (isFinal) {
        setLocating(false);
        setLocateStatus('Location found! ✓');
        setTimeout(() => setLocateStatus(''), 2500);
      }
    };

    // Step 1: Instant Low-Accuracy / WiFi / Cell / Cached GPS (<1s response on mobile phones)
    navigator.geolocation.getCurrentPosition(
      (fastPos) => {
        applyLocation(fastPos.coords.latitude, fastPos.coords.longitude, false);

        // Step 2: Background High Accuracy GPS refinement (if outdoors / satellite available)
        navigator.geolocation.getCurrentPosition(
          (precisePos) => {
            applyLocation(precisePos.coords.latitude, precisePos.coords.longitude, true);
          },
          () => {
            // Already applied fast position successfully
            setLocating(false);
            setLocateStatus('Location found! ✓');
            setTimeout(() => setLocateStatus(''), 2500);
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocating(false);
          setLocateStatus('Permission blocked');
          setError('Naka-block ang Location. I-tap ang pin sa mapa.');
          setTimeout(() => setLocateStatus(''), 3500);
          return;
        }

        // Step 3: Generous fallback if first instant attempt missed
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            applyLocation(fallbackPos.coords.latitude, fallbackPos.coords.longitude, true);
          },
          () => {
            setLocating(false);
            setLocateStatus('Pin on map');
            setError('Hindi ma-detect ang GPS. I-tap ang pin sa mapa.');
            setTimeout(() => setLocateStatus(''), 3500);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (checkoutCart.length === 0) return;

    const newErrors = {};
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Paki-lagay ang iyong Full Name.';
    }
    if (orderType === 'delivery') {
      if (!deliveryLocation) {
        newErrors.mapPin = 'Paki-tap o i-drag ang iyong delivery pin sa mapa.';
      }
      if (!deliveryAddress || !deliveryAddress.trim()) {
        newErrors.landmark = 'Paki-lagay ang iyong kumpletong address o landmark.';
      }
    }
    if (!formData.preferredDate) {
      newErrors.preferredDate = `Paki-pili ang target ${orderType === 'pickup' ? 'pickup' : 'delivery'} date.`;
    }
    if (!formData.preferredTime) {
      newErrors.preferredTime = 'Paki-pili ang target time needed.';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError('May mga kulang na impormasyon. Paki-kumpleto ang mga naka-highlight na field.');

      setTimeout(() => {
        const order = ['name', 'mapPin', 'landmark', 'preferredDate', 'preferredTime'];
        for (const k of order) {
          if (newErrors[k]) {
            let elId = '';
            if (k === 'name') elId = 'name';
            else if (k === 'mapPin') elId = 'map-container-wrapper';
            else if (k === 'landmark') elId = 'landmark';
            else if (k === 'preferredDate') elId = orderType === 'delivery' ? 'preferred-date' : 'preferred-date-pickup';
            else if (k === 'preferredTime') elId = orderType === 'delivery' ? 'preferred-time' : 'preferred-time-pickup';

            const el = document.getElementById(elId);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              if (el.focus && typeof el.focus === 'function') el.focus();
              break;
            }
          }
        }
      }, 60);
      return;
    }

    setSubmitting(true);
    setError('');
    setFieldErrors({});

    const deliveryFee = dynamicDeliveryFee;
    const orderTotalAmount = subtotal + deliveryFee;
    let referenceCode = '';

    try {
      referenceCode = await generateOrderReference();
    } catch {
      referenceCode = `M&M-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Build combined notes with FB profile
    const customerNotes = formData.facebookName
      ? `[FB Profile: ${formData.facebookName}] ${formData.notes || ''}`.trim()
      : (formData.notes || '');

    // Format all items with their options and pricing
    const formattedOrderItems = checkoutCart.map((item, idx) => {
      const itemUnitPrice = parseFloat(item.unitPrice) || 0;
      const itemLinePrice = itemUnitPrice * (item.quantity || 1);
      return {
        id: `item-${idx}-${Date.now()}`,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: itemUnitPrice,
        total_price: itemLinePrice,
        order_item_options: (item.options || []).map((o) => ({
          option_name: o.optionName,
          option_value: o.optionValue,
          additional_cost: o.additionalCost || 0,
        })),
      };
    });

    // Save into local mock order layer so all items are instantly viewable on confirmation & track
    addMockOrder({
      reference_code: referenceCode,
      customer_name: formData.name,
      customer_phone: formData.phone,
      order_type: orderType,
      status: 'pending',
      subtotal,
      delivery_fee: deliveryFee,
      rush_fee: appliedRushFee,
      is_rush: isRush,
      voucher_discount: voucherDiscount || 0,
      total_amount: totalAmount,
      notes: customerNotes,
      preferred_date: formData.preferredDate || null,
      preferred_time: formData.preferredTime || null,
      order_items: formattedOrderItems,
      delivery_location: deliveryLocation ? {
        latitude: deliveryLocation.lat,
        longitude: deliveryLocation.lng,
        address: deliveryAddress,
        landmark_notes: customerNotes,
      } : null,
    });

    // Store in localStorage
    try {
      const orderPayload = {
        referenceCode,
        customerName: formData.name,
        customerPhone: formData.phone,
        facebookName: formData.facebookName,
        orderType,
        deliveryAddress: deliveryAddress || '',
        subtotal,
        deliveryFee,
        rushFee: appliedRushFee,
        isRush: isRush,
        voucherDiscount: voucherDiscount || 0,
        appliedVoucherCode: appliedVoucher?.code || null,
        totalAmount,
        notes: customerNotes,
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
        items: checkoutCart,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(`likha_last_order_${referenceCode}`, JSON.stringify(orderPayload));

      // Mark single-use voucher as used so it cannot be reused
      if (appliedVoucher?.code) {
        markVoucherAsUsed(appliedVoucher.code);
      }
      const updatedOrders = [
        {
          referenceCode,
          customerName: formData.name,
          orderType,
          totalAmount,
          itemsSummary: checkoutCart.map(i => `${i.productName} ×${i.quantity}`).join(', '),
          createdAt: new Date().toISOString(),
          status: 'confirmed',
        },
        ...existingOrders.filter(o => o.referenceCode !== referenceCode),
      ];
      localStorage.setItem('likha_my_orders', JSON.stringify(updatedOrders.slice(0, 15)));

      // Save full admin-compatible order object for admin panel
      const fullAdminOrder = {
        id: `ord-${Date.now()}`,
        reference_code: referenceCode,
        customer_name: formData.name,
        customer_phone: formData.phone,
        facebook_name: formData.facebookName || '',
        order_type: orderType,
        status: 'confirmed',
        subtotal,
        delivery_fee: deliveryFee,
        rush_fee: appliedRushFee,
        is_rush: isRush,
        total_amount: totalAmount,
        total_cost: checkoutCart.reduce((s, i) => s + (((parseFloat(i.unitPrice) || 0) * 0.4) * (i.quantity || 1)), 0),
        preferred_date: formData.preferredDate || null,
        preferred_time: formData.preferredTime || null,
        notes: customerNotes || '',
        created_at: new Date().toISOString(),
        order_items: formattedOrderItems.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          unit_cost: item.unit_price * 0.4,
          total_cost: item.total_price * 0.4,
          options: (checkoutCart[idx]?.options || []).map(opt => ({
            option_name: opt.optionName,
            option_value: opt.optionValue,
            additional_cost: opt.additionalCost || 0,
          })),
        })),
        delivery_location: deliveryLocation ? {
          latitude: deliveryLocation.lat,
          longitude: deliveryLocation.lng,
          address: deliveryAddress,
          landmark_notes: customerNotes,
        } : null,
      };

      const existingAdminOrders = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
      const updatedAdminOrders = [
        fullAdminOrder,
        ...existingAdminOrders.filter(o => o.reference_code !== referenceCode),
      ];
      localStorage.setItem('likha_admin_orders', JSON.stringify(updatedAdminOrders));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('likha_order_placed', { detail: fullAdminOrder }));
      }
    } catch {}

    // 1. Post to /api/orders endpoint for cross-device, LAN, and multi-browser persistence
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullAdminOrder),
      });
    } catch (apiErr) {
      console.warn('API /api/orders sync note:', apiErr);
    }

    // 2. Also insert into Supabase directly if client is available
    try {
      const supabase = createClient();
      if (supabase) {
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .upsert({
            reference_code: referenceCode,
            customer_name: formData.name,
            customer_phone: formData.phone || '',
            facebook_name: formData.facebookName || '',
            order_type: orderType,
            status: 'confirmed',
            subtotal,
            delivery_fee: deliveryFee,
            rush_fee: appliedRushFee || 0,
            is_rush: Boolean(isRush),
            total_amount: totalAmount,
            total_cost: fullAdminOrder.total_cost || 0,
            notes: customerNotes || '',
            preferred_date: formData.preferredDate || null,
            preferred_time: formData.preferredTime || null,
          }, { onConflict: 'reference_code' })
          .select()
          .single();

        if (!orderErr && order) {
          const dbOrderItems = formattedOrderItems.map((item) => ({
            order_id: order.id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            unit_cost: item.unit_price * 0.4,
            total_cost: item.total_price * 0.4,
          }));

          const { data: insertedItems } = await supabase
            .from('order_items')
            .insert(dbOrderItems)
            .select();

          if (insertedItems) {
            const allOptions = [];
            checkoutCart.forEach((cartItem, idx) => {
              if (cartItem.options?.length && insertedItems[idx]) {
                cartItem.options.forEach((opt) => {
                  allOptions.push({
                    order_item_id: insertedItems[idx].id,
                    option_name: opt.optionName,
                    option_value: opt.optionValue,
                    additional_cost: opt.additionalCost || 0,
                  });
                });
              }
            });

            if (allOptions.length > 0) {
              await supabase.from('order_item_options').insert(allOptions);
            }
          }

          if (orderType === 'delivery' && deliveryLocation) {
            await supabase.from('delivery_locations').insert({
              order_id: order.id,
              latitude: deliveryLocation.lat,
              longitude: deliveryLocation.lng,
              address: deliveryAddress,
              landmark_notes: customerNotes,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Database insert note:', err);
    }

    // Remove only checked out items from cart if from regular cart
    if (!isDirectCheckout) {
      removeItems(checkoutCart.map((item) => item.cartItemId));
      try {
        localStorage.removeItem('likha_checkout_items');
      } catch {}
    } else {
      try {
        localStorage.removeItem('likha_direct_checkout_item');
      } catch {}
    }

    router.push(`/confirmation/${referenceCode}`);
  };

  const handleGoBack = (e) => {
    if (e) e.preventDefault();
    if (isDirectCheckout) {
      try {
        localStorage.removeItem('likha_direct_checkout_item');
      } catch {}
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (isDirectCheckout && directItem?.productSlug) {
      router.push(`/shop/${directItem.productSlug}`);
    } else {
      router.push('/cart');
    }
  };

  return (
    <div className="customer-shell">
      <header className="top-bar" style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
        <button
          type="button"
          onClick={handleGoBack}
          className="top-bar-action"
          aria-label="Go back"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            flexShrink: 0,
          }}
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="top-bar-title" style={{ flex: 1, margin: 0, textAlign: 'center' }}>Checkout</span>
        <div style={{ width: 40, flexShrink: 0 }} />
      </header>

      <main className="page-content page-enter" style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', overflowX: 'hidden' }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '640px', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden' }}>
          {/* Customer Details */}
          <div className="section" style={{ paddingTop: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h2 className="section-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                Customer Details
              </h2>
              {formData.name && (
                <span style={{
                  fontSize: '11px',
                  color: 'var(--color-success)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--color-success-bg, #F0FDF4)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(21, 128, 61, 0.15)'
                }}>
                  <i className="fa-solid fa-bolt" style={{ fontSize: '10px' }}></i> Auto-filled
                </span>
              )}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="name">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="name"
                className="input"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                autoComplete="name"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderColor: fieldErrors.name ? '#EF4444' : undefined,
                  boxShadow: fieldErrors.name ? '0 0 0 3px rgba(239, 68, 68, 0.14)' : undefined,
                }}
              />
              {fieldErrors.name && (
                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '10px' }}></i>
                  <span>{fieldErrors.name}</span>
                </p>
              )}
            </div>
          </div>

          <hr className="divider" style={{ margin: 0 }} />

          {/* Claim Method */}
          <div className="section">
            <h2 className="section-title" style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>
              Claim Method
            </h2>
            <div className="fulfillment-toggle" role="radiogroup" aria-label="Claim method" style={{ width: '100%', boxSizing: 'border-box' }}>
              <button
                type="button"
                className={`fulfillment-option${orderType === 'delivery' ? ' selected' : ''}`}
                onClick={() => setOrderType('delivery')}
                role="radio"
                aria-checked={orderType === 'delivery'}
                id="fulfillment-delivery"
                style={{ boxSizing: 'border-box' }}
              >
                <span className="fulfillment-option-icon">
                  <i className="fa-solid fa-truck"></i>
                </span>
                <span className="fulfillment-option-label">Delivery</span>
              </button>
              <button
                type="button"
                className={`fulfillment-option${orderType === 'pickup' ? ' selected' : ''}`}
                onClick={() => setOrderType('pickup')}
                role="radio"
                aria-checked={orderType === 'pickup'}
                id="fulfillment-pickup"
                style={{ boxSizing: 'border-box' }}
              >
                <span className="fulfillment-option-icon">
                  <i className="fa-solid fa-store"></i>
                </span>
                <span className="fulfillment-option-label">Pickup</span>
              </button>
            </div>

            {/* Delivery Flow: Pin -> Address -> Target Delivery Date */}
            {orderType === 'delivery' && (
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label className="input-label" style={{ margin: 0 }}>
                      Pin Location <span className="required">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={locating}
                      className="btn btn-ghost btn-sm"
                      id="use-location-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        padding: '2px 8px',
                      }}
                    >
                      <i className={locating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-location-crosshairs'}></i>
                      <span>{locating ? 'Locating...' : locateStatus || 'Use My Location'}</span>
                    </button>
                  </div>

                  <div
                    id="map-container-wrapper"
                    tabIndex={-1}
                    ref={mapRef}
                    className="map-container"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      height: '240px',
                      borderRadius: 'var(--radius-xl)',
                      overflow: 'hidden',
                      border: fieldErrors.mapPin ? '2px solid #EF4444' : '1.5px solid var(--color-border)',
                      boxShadow: fieldErrors.mapPin ? '0 0 0 3px rgba(239, 68, 68, 0.14)' : '0 2px 10px rgba(0,0,0,0.08)',
                      marginBottom: 'var(--space-2)',
                      zIndex: 1,
                      boxSizing: 'border-box',
                    }}
                  />
                  {fieldErrors.mapPin && (
                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '2px', marginBottom: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '10px' }}></i>
                      <span>{fieldErrors.mapPin}</span>
                    </p>
                  )}
                </div>

                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="input-label" htmlFor="landmark" style={{ margin: 0 }}>
                      Complete Address / Landmark <span className="required">*</span>
                    </label>
                    {addressLoading && (
                      <span style={{ fontSize: '11px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> Detecting landmark...
                      </span>
                    )}
                  </div>
                  <input
                    id="landmark"
                    className="input"
                    type="text"
                    placeholder="House/Unit No., Street, Barangay, or nearby Landmark"
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      if (fieldErrors.landmark) setFieldErrors(prev => ({ ...prev, landmark: null }));
                    }}
                    style={{
                      marginTop: 'var(--space-1)',
                      borderColor: fieldErrors.landmark ? '#EF4444' : undefined,
                      boxShadow: fieldErrors.landmark ? '0 0 0 3px rgba(239, 68, 68, 0.14)' : undefined,
                    }}
                  />
                  {fieldErrors.landmark && (
                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '10px' }}></i>
                      <span>{fieldErrors.landmark}</span>
                    </p>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    💡 Tip: I-drag ang pin o magdagdag ng landmark (hal. kulay ng gate).
                  </span>
                </div>

                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '10px', alignItems: 'start' }}>
                    <PremiumDatePicker
                      id="preferred-date"
                      name="preferredDate"
                      label="Target Delivery Date"
                      placeholder="Select date..."
                      value={formData.preferredDate}
                      onChange={(val) => handleInputChange('preferredDate', val)}
                      minDate={new Date().toISOString().split('T')[0]}
                      error={fieldErrors.preferredDate}
                    />
                    <PremiumTimePicker
                      id="preferred-time"
                      name="preferredTime"
                      label="Time Needed"
                      placeholder="Select time..."
                      value={formData.preferredTime}
                      onChange={(val) => handleInputChange('preferredTime', val)}
                      error={fieldErrors.preferredTime}
                    />
                  </div>
                  {isRush && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '12px',
                      color: '#C2410C',
                      background: '#FFF7ED',
                      border: '1px solid #FFEDD5',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontWeight: '500',
                      lineHeight: 1.3,
                    }}>
                      Rush Order: Priority crafting queue (Within 24-48h)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pickup Flow: Location Card -> Target Pickup Date -> Schedule Note */}
            {orderType === 'pickup' && (
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{
                  background: 'var(--color-surface-warm)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  border: '1px solid var(--color-border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'var(--color-primary-lighter)',
                      color: 'var(--color-primary)',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}>
                      <i className="fa-solid fa-store"></i>
                    </span>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-text)' }}>
                      Pickup Location
                    </span>
                  </div>

                  <div style={{ paddingLeft: '30px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: '500', margin: 0, lineHeight: 1.4 }}>
                      {settings.pickup_address || 'Poblacion, Barugo, Leyte (Near Town Plaza)'}
                    </p>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '10px', alignItems: 'start' }}>
                    <PremiumDatePicker
                      id="preferred-date-pickup"
                      name="preferredDate"
                      label="Target Pickup Date"
                      placeholder="Select date..."
                      value={formData.preferredDate}
                      onChange={(val) => handleInputChange('preferredDate', val)}
                      minDate={new Date().toISOString().split('T')[0]}
                      error={fieldErrors.preferredDate}
                    />
                    <PremiumTimePicker
                      id="preferred-time-pickup"
                      name="preferredTime"
                      label="Time Needed"
                      placeholder="Select time..."
                      value={formData.preferredTime}
                      onChange={(val) => handleInputChange('preferredTime', val)}
                      error={fieldErrors.preferredTime}
                    />
                  </div>
                  {isRush && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '12px',
                      color: '#C2410C',
                      background: '#FFF7ED',
                      border: '1px solid #FFEDD5',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontWeight: '500',
                      lineHeight: 1.3,
                    }}>
                      Rush Order: Priority crafting queue (Within 24-48h)
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11.5px',
                  color: 'var(--color-text-muted)',
                  background: 'var(--color-surface-warm)',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-light)'
                }}>
                  <i className="fa-regular fa-clock" style={{ fontSize: '12px', color: 'var(--color-primary)', flexShrink: 0 }}></i>
                  <span>Exact pickup time on your chosen date will be coordinated via Messenger.</span>
                </div>
              </div>
            )}
          </div>

          <hr className="divider" style={{ margin: 0 }} />

          {/* Optional Notes */}
          <div className="section">
            <div className="input-group">
              <label className="input-label" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                className="input"
                placeholder="Special instructions or notes for your order (optional)..."
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <hr className="divider" style={{ margin: 0 }} />

          {/* Order Summary */}
          <div className="section">
            <div className="order-summary" style={{ padding: '16px 18px', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 className="section-title" style={{ fontSize: '14.5px', fontWeight: '800', margin: 0 }}>
                  Order Summary
                </h2>
                <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--color-text-secondary)', background: 'var(--color-surface-warm, #F3F4F6)', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border-light)' }}>
                  {checkoutCart.length} {checkoutCart.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Itemized Products Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed var(--color-border)' }}>
                {checkoutCart.map((item) => {
                  const lineTotal = (parseFloat(item.unitPrice) || 0) * (item.quantity || 1);
                  return (
                    <div key={item.cartItemId || item.productId} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {item.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photo}
                          alt={item.productName}
                          style={{ width: '46px', height: '46px', objectFit: 'contain', background: '#FAF8F5', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--color-border-light)', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: '46px', height: '46px', borderRadius: 'var(--radius-md, 8px)', background: 'var(--color-surface-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                          <i className="fa-solid fa-gift" />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Line 1: Title + Price in perfect horizontal alignment */}
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.productName}
                          </span>
                          <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--color-text)', flexShrink: 0 }}>
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>

                        {/* Line 2: Variant Tag + Quantity on a single balanced line */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                          {item.options && item.options.length > 0 && item.options.map((opt, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '11px',
                                background: 'var(--color-surface-warm, #FAF8F5)',
                                color: 'var(--color-text-secondary)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--color-border-light)',
                                fontWeight: '500',
                              }}
                            >
                              {opt.optionValue} {parseFloat(opt.additionalCost) > 0 ? `(+₱${opt.additionalCost})` : ''}
                            </span>
                          ))}
                          <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                            {item.options?.length > 0 ? '· ' : ''}Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fee Breakdown */}
              <div className="order-summary-row" style={{ padding: '3px 0', fontSize: '13px' }}>
                <span>Subtotal ({checkoutCart.length} {checkoutCart.length === 1 ? 'item' : 'items'})</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(subtotal)}</span>
              </div>
              <div className="order-summary-row" style={{ padding: '3px 0', fontSize: '13px' }}>
                <span>Delivery Fee</span>
                <span style={{ fontWeight: '600', color: orderType === 'delivery' ? 'var(--color-text)' : 'var(--color-success, #16A34A)' }}>
                  {orderType === 'delivery' ? formatCurrency(dynamicDeliveryFee) : 'FREE (Pickup)'}
                </span>
              </div>

              {/* Rush Fee Line in Breakdown */}
              {appliedRushFee > 0 && (
                <div className="order-summary-row" style={{ padding: '3px 0', fontSize: '13px', color: '#EA580C' }}>
                  <span style={{ fontWeight: '500' }}>Rush Fee</span>
                  <span style={{ fontWeight: '700' }}>+{formatCurrency(appliedRushFee)}</span>
                </div>
              )}

              {/* Promo / Game Voucher Line in Breakdown (No ticket icon, clean text) */}
              {appliedVoucher && (
                <div className="order-summary-row" style={{ padding: '3px 0', fontSize: '13px', color: '#EA580C' }}>
                  <span style={{ fontWeight: '500' }}>Voucher Discount</span>
                  <span style={{ fontWeight: '700' }}>-{formatCurrency(voucherDiscount)}</span>
                </div>
              )}

              {/* Voucher / Promo Code Section */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--color-border)' }}>
                {appliedVoucher ? (
                  /* Applied State: Clean, Minimalist Card (No icons, perfectly proportioned) */
                  <div
                    style={{
                      background: '#FFF8F5',
                      border: '1px solid #FED7AA',
                      borderRadius: '8px',
                      padding: '7px 11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1E1E24' }}>
                        ₱{appliedVoucher.discount} OFF Voucher
                      </span>
                      {appliedVoucher.minSpend && (
                        <span style={{ fontSize: '11px', color: '#78716C', fontWeight: '500' }}>
                          (Min. spend ₱{appliedVoucher.minSpend})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        color: '#78716C',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '3px 8px',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#FCA5A5';
                        e.currentTarget.style.color = '#DC2626';
                        e.currentTarget.style.background = '#FEF2F2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.color = '#78716C';
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  /* Unapplied State: Comfortable Input + Available Voucher */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Enter promo code"
                        value={voucherInput}
                        onChange={(e) => {
                          setVoucherInput(e.target.value.toUpperCase());
                          if (voucherError) setVoucherError('');
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 11px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          fontWeight: '600',
                          letterSpacing: '0.03em',
                          height: '36px',
                          background: '#FFFFFF',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={!voucherInput.trim()}
                        className="btn btn-sm"
                        style={{
                          background: voucherInput.trim() ? '#EA580C' : '#E5E7EB',
                          color: voucherInput.trim() ? '#FFFFFF' : '#9CA3AF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          height: '36px',
                          cursor: voucherInput.trim() ? 'pointer' : 'default',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Apply
                      </button>
                    </div>

                    {/* Quick-Tap Single Available Voucher from Arcade Wallet */}
                    {walletVouchers.length > 0 && (() => {
                      const best = getBestApplicableVoucher(subtotal);
                      if (!best) return null;
                      const isEligible = subtotal >= (best.minSpend || 0);
                      const lacking = Math.max(0, (best.minSpend || 0) - subtotal);
                      return (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isEligible ? '#FFF8F5' : '#F9FAFB',
                            border: `1px solid ${isEligible ? '#FED7AA' : '#E5E7EB'}`,
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '11.5px',
                          }}
                        >
                          <span style={{ color: isEligible ? '#C2410C' : '#6B7280', fontWeight: '600' }}>
                            ₱{best.discount} OFF Voucher {isEligible ? `(Min. spend ₱${best.minSpend})` : `(Add ₱${lacking.toFixed(0)} more)`}
                          </span>
                          {isEligible ? (
                            <button
                              type="button"
                              onClick={() => handleSelectVoucherFromWallet(best)}
                              style={{
                                background: '#EA580C',
                                color: '#FFF',
                                border: 'none',
                                borderRadius: '5px',
                                padding: '3px 10px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              Apply
                            </button>
                          ) : (
                            <span style={{ fontSize: '10.5px', color: '#9CA3AF', fontWeight: '600' }}>Locked</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {voucherError && (
                  <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '4px' }}></i>
                    {voucherError}
                  </div>
                )}
              </div>

              <div className="order-summary-row total" style={{ marginTop: '8px', paddingTop: '10px', fontSize: '14px', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: '700' }}>Total Amount</span>
                <span className="amount" style={{ fontSize: '17px', fontWeight: '800' }}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              margin: '0 var(--space-4) var(--space-3)',
              padding: '8px 12px',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '500',
              lineHeight: 1.3,
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ flexShrink: 0, fontSize: '12px' }}></i>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{error}</span>
            </div>
          )}

          <div style={{ padding: '0 var(--space-4) var(--space-20)' }}>
            <button
              type="submit"
              className="btn btn-primary btn-full ripple"
              disabled={submitting || checkoutCart.length === 0}
              id="submit-order-btn"
              style={{
                height: '46px',
                fontSize: '15px',
                fontWeight: 'var(--weight-bold)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <i className={submitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'}></i>
              <span>{submitting ? 'Submitting Order...' : 'Submit Order Request'}</span>
            </button>
            <p style={{
              fontSize: '11.5px',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              marginTop: '10px',
              lineHeight: 1.3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}>
              <i className="fa-solid fa-circle-info" style={{ color: 'var(--color-primary)', fontSize: '12px' }}></i>
              <span>I-send ang resibo sa Messenger after checkout para ma-confirm.</span>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

