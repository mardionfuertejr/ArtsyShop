'use client';

import { useState, useMemo, useRef } from 'react';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function DashboardSalesAnalyticsChart({ orders = [] }) {
  const [timeframe, setTimeframe] = useState('30d'); // '7d' | '30d' | 'this_month'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const containerRef = useRef(null);

  // 1. Filter and aggregate order data
  const { chartData, totalSales, totalOrdersCount } = useMemo(() => {
    const now = new Date();
    const validOrders = orders.filter((o) => o.status !== 'cancelled');

    let startDate = new Date();
    let dayCount = 30;

    if (timeframe === '7d') {
      dayCount = 7;
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '30d') {
      dayCount = 30;
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      dayCount = lastDay;
    }

    const daysMap = new Map();
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const fullDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      daysMap.set(key, {
        dateKey: key,
        label,
        fullDate,
        totalSales: 0,
        orderCount: 0,
        products: new Map(),
      });
    }

    let sumSales = 0;
    let sumOrders = 0;

    validOrders.forEach((ord) => {
      const ordDate = ord.created_at ? new Date(ord.created_at) : new Date();
      const dateKey = ordDate.toISOString().split('T')[0];
      const amount = parseFloat(ord.total_amount) || 0;

      if (daysMap.has(dateKey)) {
        const day = daysMap.get(dateKey);
        day.totalSales += amount;
        day.orderCount += 1;
        sumSales += amount;
        sumOrders += 1;

        (ord.order_items || []).forEach((it) => {
          const pName = it.product_name || 'Custom Craft';
          const qty = Number(it.quantity) || 1;
          const price = parseFloat(it.total_price) || (parseFloat(it.unit_price) || 0) * qty;

          if (day.products.has(pName)) {
            const existing = day.products.get(pName);
            existing.quantity += qty;
            existing.total += price;
          } else {
            day.products.set(pName, { name: pName, quantity: qty, total: price });
          }
        });
      }
    });

    const dataPoints = Array.from(daysMap.values()).map((d) => ({
      ...d,
      productsList: Array.from(d.products.values()).sort((a, b) => b.quantity - a.quantity),
    }));

    return {
      chartData: dataPoints,
      totalSales: sumSales,
      totalOrdersCount: sumOrders,
    };
  }, [orders, timeframe]);

  // 2. SVG Geometry Calculations
  const svgWidth = 820;
  const svgHeight = 240;
  const paddingLeft = 58;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 38;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const baselineY = paddingTop + chartHeight;

  const maxVal = Math.max(...chartData.map((d) => d.totalSales), 500);
  const yMax = Math.ceil(maxVal / 500) * 500;

  const points = chartData.map((d, index) => {
    const x = paddingLeft + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.totalSales / yMax) * chartHeight;
    return { ...d, x, y, index };
  });

  // Monotone Spline algorithm for ultra-smooth non-overshooting curves
  const createMonotoneSplinePath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 5.5;
      let cp1y = p1.y + (p2.y - p0.y) / 5.5;

      const cp2x = p2.x - (p3.x - p1.x) / 5.5;
      let cp2y = p2.y - (p3.y - p1.y) / 5.5;

      // Clamp control points to baseline so zero sales stay strictly flat
      if (p1.y >= baselineY - 0.5 && p2.y >= baselineY - 0.5) {
        cp1y = baselineY;
        cp2y = baselineY;
      } else {
        cp1y = Math.min(cp1y, baselineY);
        cp2y = Math.min(cp2y, baselineY);
      }

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return path;
  };

  const linePath = createMonotoneSplinePath(points);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${baselineY} L ${points[0].x.toFixed(2)} ${baselineY} Z`
    : '';

  const yTicks = [0, yMax * 0.33, yMax * 0.66, yMax];
  const step = Math.max(1, Math.ceil(chartData.length / 7));
  const xLabels = points.filter((_, idx) => idx % step === 0 || idx === points.length - 1);

  // Mouse move handler across entire chart area
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relativeX = (clientX / rect.width) * svgWidth;

    if (relativeX < paddingLeft - 25 || relativeX > svgWidth - paddingRight + 25) {
      setHoveredPoint(null);
      return;
    }

    let closest = points[0];
    let minDiff = Infinity;
    for (const pt of points) {
      const diff = Math.abs(pt.x - relativeX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    setHoveredPoint(closest);
  };

  return (
    <div
      className="card"
      style={{
        background: 'var(--color-surface, #ffffff)',
        borderRadius: '16px',
        padding: '22px 24px',
        boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(0,0,0,0.02)',
        border: '1px solid #E2E8F0',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes haloPulse {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.45); opacity: 0.25; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.12), rgba(249, 115, 22, 0.05))',
              color: '#EA580C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              border: '1px solid rgba(234, 88, 12, 0.15)',
            }}
          >
            <i className="fa-solid fa-chart-line"></i>
          </div>

          <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text, #0f172a)', margin: 0, letterSpacing: '-0.02em' }}>
            Sales Analytics
          </h2>

          {/* Aggregate Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(234, 88, 12, 0.06)',
              border: '1px solid rgba(234, 88, 12, 0.15)',
              padding: '3px 11px',
              borderRadius: '9999px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EA580C', display: 'inline-block' }}></span>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#EA580C' }}>
              {formatCurrency(totalSales)}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: '600' }}>•</span>
            <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: '600' }}>
              {totalOrdersCount} {totalOrdersCount === 1 ? 'order' : 'orders'}
            </span>
          </div>
        </div>

        {/* Minimal Segmented Control */}
        <div
          style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '9px',
            gap: '3px',
            border: '1px solid #E2E8F0',
          }}
        >
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: 'this_month', label: 'This Month' },
          ].map((tab) => {
            const isActive = timeframe === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setTimeframe(tab.key);
                  setHoveredPoint(null);
                }}
                style={{
                  border: 'none',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '11.5px',
                  padding: '5px 12px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
        style={{
          position: 'relative',
          width: '100%',
          cursor: 'crosshair',
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            overflow: 'visible',
          }}
        >
          <defs>
            <linearGradient id="salesGradientGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA580C" stopOpacity="0.20" />
              <stop offset="70%" stopColor="#EA580C" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
            </linearGradient>

            <filter id="lineSoftGlow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#EA580C" floodOpacity="0.22" />
            </filter>
          </defs>

          {/* Y-Axis Grid Lines & Tick Labels */}
          {yTicks.map((val, idx) => {
            const y = paddingTop + chartHeight - (val / yMax) * chartHeight;
            return (
              <g key={`y-grid-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke={idx === 0 ? '#E2E8F0' : '#F1F5F9'}
                  strokeWidth={idx === 0 ? 1.2 : 1}
                  strokeDasharray={idx === 0 ? 'none' : '4 5'}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94A3B8"
                  fontWeight="600"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  ₱{val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Smooth Area Gradient */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#salesGradientGlow)"
              style={{ transition: 'd 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          )}

          {/* Smooth Curve Stroke */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#EA580C"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineSoftGlow)"
              style={{ transition: 'd 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          )}

          {/* Active Hover Crosshair Line */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingTop - 6}
                x2={hoveredPoint.x}
                y2={baselineY}
                stroke="#EA580C"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.65"
              />
            </g>
          )}

          {/* Data Points: Pulsing halo on hover, subtle solid dot on sales days */}
          {points.map((pt, idx) => {
            const isHovered = hoveredPoint && hoveredPoint.index === pt.index;
            const hasSales = pt.totalSales > 0;

            if (!hasSales && !isHovered) return null;

            return (
              <g key={`dot-${idx}`}>
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="9"
                    fill="rgba(234, 88, 12, 0.22)"
                    style={{ animation: 'haloPulse 1.4s infinite ease-in-out', transformOrigin: `${pt.x}px ${pt.y}px` }}
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={isHovered ? '#EA580C' : '#FFFFFF'}
                  stroke="#EA580C"
                  strokeWidth={isHovered ? 2.5 : 2}
                  style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
                />
              </g>
            );
          })}

          {/* X-Axis Date Labels */}
          {xLabels.map((pt, idx) => {
            const isHovered = hoveredPoint?.index === pt.index;
            return (
              <text
                key={`x-lbl-${idx}`}
                x={pt.x}
                y={svgHeight - 8}
                textAnchor="middle"
                fontSize="10"
                fill={isHovered ? '#EA580C' : '#64748B'}
                fontWeight={isHovered ? '800' : '500'}
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{ transition: 'fill 0.15s ease, font-weight 0.15s ease' }}
              >
                {pt.label}
              </text>
            );
          })}
        </svg>

        {/* Floating Glassmorphism Tooltip Card with Smart Adaptive Placement */}
        {hoveredPoint && (() => {
          const isRightSide = hoveredPoint.x > svgWidth * 0.58;
          const isUpperPeak = hoveredPoint.y <= 115;
          const isLowerBaseline = hoveredPoint.y >= 170;

          const leftPos = isRightSide
            ? `calc(${(hoveredPoint.x / svgWidth) * 100}% - 14px)`
            : `calc(${(hoveredPoint.x / svgWidth) * 100}% + 14px)`;

          const transformX = isRightSide ? '-100%' : '0%';
          let transformY = '-50%';
          let topPos = `${(hoveredPoint.y / svgHeight) * 100}%`;

          if (isUpperPeak) {
            topPos = '4px';
            transformY = '0%';
          } else if (isLowerBaseline) {
            topPos = 'auto';
            transformY = '0%';
          }

          return (
            <div
              style={{
                position: 'absolute',
                top: isLowerBaseline ? 'auto' : topPos,
                bottom: isLowerBaseline ? '34px' : 'auto',
                left: leftPos,
                transform: `translate(${transformX}, ${transformY})`,
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                color: '#0F172A',
                padding: '12px 14px',
                borderRadius: '13px',
                boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(0,0,0,0.06)',
                border: '1px solid #E2E8F0',
                zIndex: 60,
                minWidth: '220px',
                maxWidth: '280px',
                pointerEvents: 'none',
                animation: 'floatIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Header: Date + Sales Amount */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748B' }}>
                  {hoveredPoint.label}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#EA580C', letterSpacing: '-0.01em' }}>
                  {formatCurrency(hoveredPoint.totalSales)}
                </span>
              </div>

              {/* Orders Summary Count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#475569', fontWeight: '600', marginBottom: hoveredPoint.productsList.length > 0 ? '8px' : '0' }}>
                {hoveredPoint.orderCount > 0 ? (
                  <>
                    <span>📦 {hoveredPoint.orderCount} {hoveredPoint.orderCount === 1 ? 'order' : 'orders'} placed</span>
                    {hoveredPoint.productsList.length > 0 && (
                      <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '500' }}>
                        {hoveredPoint.productsList.length} items
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: '#94A3B8', fontWeight: '500', fontSize: '10.5px' }}>
                    No orders on this day
                  </span>
                )}
              </div>

              {/* Sold Products List with Smooth Clean Scroll */}
              {hoveredPoint.productsList && hoveredPoint.productsList.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    maxHeight: '145px',
                    overflowY: 'auto',
                    paddingRight: '2px',
                  }}
                >
                  {hoveredPoint.productsList.map((prod, pIdx) => (
                    <div
                      key={pIdx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        color: '#334155',
                        background: '#F8FAFC',
                        padding: '4px 7px',
                        borderRadius: '6px',
                        border: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                        <span
                          style={{
                            background: 'rgba(234, 88, 12, 0.12)',
                            color: '#EA580C',
                            fontWeight: '800',
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            lineHeight: 1.1,
                            flexShrink: 0,
                          }}
                        >
                          {prod.quantity}×
                        </span>
                        <span style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prod.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: '700', color: '#0F172A', marginLeft: '6px', flexShrink: 0, fontSize: '11px' }}>
                        {formatCurrency(prod.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

