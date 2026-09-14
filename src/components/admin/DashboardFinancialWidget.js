'use client';

import { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function DashboardFinancialWidget({ initialSales = 0, initialExpenses = 0 }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFocusField, setActiveFocusField] = useState('gastos'); // 'kita' | 'gastos'

  // Stored / Overridden Values
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [sales, setSales] = useState(initialSales);
  const [expenses, setExpenses] = useState(initialExpenses);

  // Form Inputs in Modal
  const [salesInput, setSalesInput] = useState(initialSales);
  const [expensesInput, setExpensesInput] = useState(initialExpenses);

  const salesInputRef = useRef(null);
  const expensesInputRef = useRef(null);

  // Load saved adjustments from localStorage on mount & sync with live database values
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mm_financial_adjustments');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed) {
            const e = parsed.expenses !== undefined ? parsed.expenses : initialExpenses;
            setSales(initialSales);
            setExpenses(e);
            setSalesInput(initialSales);
            setExpensesInput(e);
            return;
          }
        }
      }
    } catch {}
    setSales(initialSales);
    setExpenses(initialExpenses);
    setSalesInput(initialSales);
    setExpensesInput(initialExpenses);
  }, [initialSales, initialExpenses]);

  // Lock body scroll & autofocus input when modal opens
  useEffect(() => {
    if (isModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        if (activeFocusField === 'kita' && salesInputRef.current) {
          salesInputRef.current.focus();
          salesInputRef.current.select();
        } else if (expensesInputRef.current) {
          expensesInputRef.current.focus();
          expensesInputRef.current.select();
        }
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsModalOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = orig;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isModalOpen, activeFocusField]);

  // Calculations
  const currentSales = isCustomMode ? sales : initialSales;
  const currentExpenses = isCustomMode ? expenses : initialExpenses;
  const netProfit = currentSales - currentExpenses;

  const totalSum = (currentSales || 0) + (currentExpenses || 0);
  const salesPct = totalSum > 0 ? Math.round((currentSales / totalSum) * 100) : 50;
  const expensesPct = 100 - salesPct;

  // Open modal with specific field focus
  const handleOpenModal = (field = 'gastos') => {
    setActiveFocusField(field);
    setSalesInput(currentSales);
    setExpensesInput(currentExpenses);
    setIsModalOpen(true);
  };

  // Save Modal
  const handleSave = (e) => {
    e.preventDefault();
    const finalSales = Math.max(0, parseFloat(salesInput) || 0);
    const finalExpenses = Math.max(0, parseFloat(expensesInput) || 0);

    setSales(finalSales);
    setExpenses(finalExpenses);
    setIsCustomMode(true);

    try {
      localStorage.setItem('mm_financial_adjustments', JSON.stringify({
        isCustom: true,
        sales: finalSales,
        expenses: finalExpenses,
      }));
    } catch {}

    setIsModalOpen(false);
  };

  // Reset back to automatic database calculation
  const handleResetToAuto = () => {
    setIsCustomMode(false);
    setSales(initialSales);
    setExpenses(initialExpenses);
    setSalesInput(initialSales);
    setExpensesInput(initialExpenses);

    try {
      localStorage.removeItem('mm_financial_adjustments');
    } catch {}

    setIsModalOpen(false);
  };

  // Live calculation for preview inside modal
  const liveSalesNum = parseFloat(salesInput) || 0;
  const liveExpenseNum = parseFloat(expensesInput) || 0;
  const liveNetProfit = liveSalesNum - liveExpenseNum;

  return (
    <>
      <div
        className="card"
        style={{
          padding: '18px 20px',
          background: 'var(--color-surface, #ffffff)',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <i className="fa-solid fa-chart-pie" style={{ color: 'var(--color-primary, #b45309)', fontSize: '14px' }}></i>
            <span>Sales & Expenses</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleOpenModal('gastos')}
              className="btn btn-secondary btn-sm"
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F1F5F9';
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#0F172A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.color = '#334155';
              }}
            >
              <i className="fa-solid fa-pen-to-square" style={{ fontSize: '11px', color: 'var(--color-primary, #b45309)' }}></i>
              <span>Edit Values</span>
            </button>
          </div>
        </div>

        {/* 2 Clean Metric Display Cards: SALES vs EXPENSES (Non-clickable) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {/* SALES STAT CARD */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              background: '#F0FDF4',
              borderRadius: '12px',
              border: '1px solid #DCFCE7',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <i className="fa-solid fa-coins"></i>
                <span>Sales</span>
              </span>
              <p style={{ fontSize: '22px', fontWeight: '900', color: '#15803D', margin: 0, lineHeight: 1.1 }}>
                {formatCurrency(currentSales)}
              </p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', fontSize: '16px' }}>
              <i className="fa-solid fa-arrow-trend-up"></i>
            </div>
          </div>

          {/* EXPENSES STAT CARD */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              background: '#FEF2F2',
              borderRadius: '12px',
              border: '1px solid #FEE2E2',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <i className="fa-solid fa-receipt"></i>
                <span>Expenses</span>
              </span>
              <p style={{ fontSize: '22px', fontWeight: '900', color: '#DC2626', margin: 0, lineHeight: 1.1 }}>
                {formatCurrency(currentExpenses)}
              </p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', fontSize: '16px' }}>
              <i className="fa-solid fa-arrow-trend-down"></i>
            </div>
          </div>
        </div>

        {/* Split Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '11px', fontWeight: '700' }}>
            <span style={{ color: '#15803D' }}>Sales: {salesPct}%</span>
            <span style={{ color: '#DC2626' }}>Expenses: {expensesPct}%</span>
          </div>

          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '9999px',
              background: '#F1F5F9',
              display: 'flex',
              overflow: 'hidden',
              gap: '2px',
            }}
          >
            <div
              style={{
                width: `${salesPct}%`,
                background: '#10B981',
                borderRadius: '9999px 0 0 9999px',
                transition: 'width 0.4s ease',
              }}
              title={`Sales: ${formatCurrency(currentSales)} (${salesPct}%)`}
            />
            <div
              style={{
                width: `${expensesPct}%`,
                background: '#EF4444',
                borderRadius: '0 9999px 9999px 0',
                transition: 'width 0.4s ease',
              }}
              title={`Expenses: ${formatCurrency(currentExpenses)} (${expensesPct}%)`}
            />
          </div>
        </div>
      </div>

      {/* Clean & Balanced Financial Modal */}
      {isModalOpen && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'adminModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'adminModalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--color-primary, #b45309)', fontSize: '15px' }}></i>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                  Edit Values
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '16px', cursor: 'pointer', padding: '4px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Field 1: Sales */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#166534', marginBottom: '6px' }}>
                  <i className="fa-solid fa-coins" style={{ fontSize: '11px' }}></i>
                  <span>Sales</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#15803D', fontSize: '14px' }}>₱</span>
                  <input
                    ref={salesInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    value={salesInput}
                    onChange={(e) => setSalesInput(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '30px',
                      fontSize: '15px',
                      fontWeight: '800',
                      borderRadius: '10px',
                      border: '1.5px solid #E2E8F0',
                      background: '#F8FAFC',
                    }}
                    required
                  />
                </div>
              </div>

              {/* Field 2: Expenses */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#991B1B', marginBottom: '6px' }}>
                  <i className="fa-solid fa-receipt" style={{ fontSize: '11px' }}></i>
                  <span>Expenses</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#DC2626', fontSize: '14px' }}>₱</span>
                  <input
                    ref={expensesInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    value={expensesInput}
                    onChange={(e) => setExpensesInput(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '30px',
                      fontSize: '15px',
                      fontWeight: '800',
                      borderRadius: '10px',
                      border: '1.5px solid #E2E8F0',
                      background: '#F8FAFC',
                    }}
                    required
                  />
                </div>
              </div>

              {/* Live Net Profit Result Banner */}
              <div style={{
                background: liveNetProfit >= 0 ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${liveNetProfit >= 0 ? '#DCFCE7' : '#FEE2E2'}`,
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '2px',
              }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                  Net Profit:
                </span>
                <span style={{ fontSize: '15px', fontWeight: '900', color: liveNetProfit >= 0 ? '#15803D' : '#DC2626' }}>
                  {formatCurrency(liveNetProfit)}
                </span>
              </div>

              {/* Action Buttons (Strictly Equal 50/50 split) */}
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}




