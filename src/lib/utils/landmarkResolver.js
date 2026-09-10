// Utility: Accurate Address & Real Landmark Resolver for LIKHA / Barugo & Leyte

// Real prominent physical POIs only (NOT entire barangays)
export const REAL_LANDMARKS = [
  { name: 'Barugo Public Market', area: 'Poblacion, Barugo', lat: 11.3248, lng: 124.7358 },
  { name: 'Barugo Municipal Hall & Plaza', area: 'Poblacion, Barugo', lat: 11.3258, lng: 124.7348 },
  { name: 'St. Joseph Parish Church', area: 'Poblacion, Barugo', lat: 11.3268, lng: 124.7355 },
  { name: 'Barugo Bus & Jeepney Terminal', area: 'Poblacion, Barugo', lat: 11.3262, lng: 124.7342 },
  { name: 'Barugo Central School', area: 'Poblacion, Barugo', lat: 11.3252, lng: 124.7365 },
  { name: 'Barugo National High School', area: 'Poblacion, Barugo', lat: 11.3232, lng: 124.7328 },
  { name: 'Barugo Port & Sea Wall', area: 'Poblacion, Barugo', lat: 11.3298, lng: 124.7372 },
  { name: 'Barugo Rural Health Unit (RHU)', area: 'Poblacion, Barugo', lat: 11.3255, lng: 124.7339 },
  { name: 'Carigara Public Market', area: 'Carigara, Leyte', lat: 11.3015, lng: 124.6850 },
  { name: 'Carigara Town Plaza', area: 'Carigara, Leyte', lat: 11.2995, lng: 124.6890 },
];

// Great-circle distance calculation in meters
export function computeDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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

// Find closest real physical landmark
export function findClosestLandmark(lat, lng) {
  let closest = null;
  let minDistance = Infinity;

  for (const lm of REAL_LANDMARKS) {
    const d = computeDistanceMeters(lat, lng, lm.lat, lm.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = { ...lm, distanceMeters: Math.round(d) };
    }
  }

  return closest;
}

// Clean and format resolved address components
function cleanAddressParts(parts) {
  const seen = new Set();
  const result = [];

  for (const p of parts) {
    if (!p) continue;
    const trimmed = p.trim().replace(/^,\s*|\s*,$/g, '');
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    
    // Skip postal codes or general country tags
    if (/^\d{4,5}$/.test(trimmed)) continue;
    if (lower === 'philippines' || lower === 'eastern visayas' || lower === 'region viii') continue;

    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }

  return result.join(', ');
}

// High-accuracy reverse geocoding & landmark resolver
export async function resolveAccurateAddress(lat, lng) {
  // Check if right beside a prominent physical landmark (max 45m radius)
  const closestLm = findClosestLandmark(lat, lng);
  const isRightBesideLandmark = closestLm && closestLm.distanceMeters <= 45;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18&accept-language=en,fil`,
      { headers: { 'User-Agent': 'LikhaApp-Barugo/1.0' } }
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      // Detect specific named place / amenity on OSM
      const poiName =
        (data.name && data.name !== addr.road && data.name !== addr.village) ? data.name :
        (addr.amenity || addr.shop || addr.building || addr.tourism || addr.leisure || '');

      const road = addr.road || addr.street || addr.pedestrian || '';
      
      let barangay = addr.village || addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || '';
      if (barangay && !barangay.toLowerCase().startsWith('brgy') && !barangay.toLowerCase().startsWith('barangay') && !barangay.toLowerCase().startsWith('poblacion')) {
        barangay = `Brgy. ${barangay}`;
      }

      const town = addr.municipality || addr.town || addr.city || 'Barugo';
      const province = addr.province || addr.state || 'Leyte';

      // 1. If literally right beside a famous landmark (within 45m)
      if (isRightBesideLandmark) {
        return cleanAddressParts([
          `Near ${closestLm.name}`,
          barangay || 'Poblacion',
          town,
          province
        ]);
      }

      // 2. If POI found on OpenStreetMap
      if (poiName) {
        return cleanAddressParts([
          poiName,
          road,
          barangay,
          town,
          province
        ]);
      }

      // 3. If on a road / street
      if (road) {
        return cleanAddressParts([
          road,
          barangay || 'Poblacion',
          town,
          province
        ]);
      }

      // 4. If in a specific barangay
      if (barangay) {
        return cleanAddressParts([
          barangay,
          town,
          province
        ]);
      }

      // 5. Fallback structured
      return cleanAddressParts([
        town,
        province
      ]);
    }
  } catch {
    // Network failure fallback
  }

  // Fallback: ONLY use landmark if within 45m, otherwise generic Poblacion Barugo
  if (isRightBesideLandmark) {
    return `Near ${closestLm.name}, ${closestLm.area}`;
  }

  return 'Poblacion, Barugo, Leyte';
}
