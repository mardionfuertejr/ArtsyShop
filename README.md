# 🌸 M&M's Artsy — E-Commerce & Workshop Management Platform

A modern, responsive e-commerce and handcraft workshop management system custom-built for **M&M's Artsy** (Palompon, Leyte). Built with **Next.js (App Router)**, **React 19**, **Supabase**, and **Vanilla CSS**.

---

## 🚀 Key Features

### 🛍️ Customer Storefront
- **10 Master Handcrafted Products:** Bouquets, Mirrors, and Single Flowers with rich customization options (colors, wrapper themes, add-ons).
- **Interactive Cart & Checkout:** Real-time subtotal, rush order fee calculation, pickup/delivery selector with interactive map pin, GCash proof of payment upload, and order review.
- **Order Tracking (`/track`):** Live tracking with interactive progress timeline, map routes, and receipt generation.
- **Artsy Fun Zone Mini-Games:** 4 interactive mini-games where customers earn discount vouchers (**Silver ₱10 OFF**, **Gold ₱20 OFF**, **Diamond ₱50 OFF**) applied automatically at checkout.
- **Customer Reviews & Feedback:** Verified buyer ratings and customer feedback drawer.

### 💼 Admin Workspace (`/admin`)
- **Dashboard Overview:** Financial widgets (Revenue, Sales, Material Expenses, Net Profit), real-time Sales Analytics line graph, urgent due date alerts, and quick notepad.
- **Orders Management (`/admin/orders`):** Comprehensive order tracking with stage progression (*Confirmed* ➔ *Crafting* ➔ *Ready* ➔ *Completed*), Messenger receipt generator, live map distance calculator, and one-click test data cleanup.
- **Product Catalog (`/admin/products`):** Full CRUD capability with custom options, multi-image upload, ready-made stock management, and bestseller badges.
- **Materials Inventory (`/admin/materials`):** 25+ raw materials tracking (Fuzzy Wires, Floral Supplies, Wrappers, Hardware) with automatic inventory deduction on order completion.
- **Customer Reviews & Feedback (`/admin/feedbacks`):** Moderate public reviews and customer service feedbacks.
- **Financial Reports (`/admin/reports`):** In-depth monthly sales and cost analysis.
- **Store Settings (`/admin/settings`):** Manage shop operating hours, GCash QR codes, game discount voucher tiers, and delivery rates.
- **Ayrion AI Co-Owner Copilot:** Intelligent conversational assistant providing immediate answers on schedules, deliveries, inventory needs, and sales insights.
- **Secure Device Push OTP Reset:** Instant 6-digit verification code sent directly to the admin's device for hassle-free password resets.

---

## 🔑 Admin Access Credentials

| Field | Value |
| :--- | :--- |
| **Admin Login URL** | `/admin/login` |
| **Admin Email** | `mardionjrcordetafuerte@gmail.com` |
| **Default Password** | `january2026` |
| **Recovery** | Device Push Notification OTP (Instant on-screen autofill) |

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** Next.js 16 (App Router), React 19, Vanilla CSS Design System, Leaflet Maps, Web Audio API
- **Backend & Database:** Next.js Route Handlers, Supabase PostgreSQL, Supabase Storage
- **Push Notifications:** Web Push Notification API, Service Worker (`/sw.js`)
- **AI Integration:** Google Gemini API / Custom Ayrion Reasoner

---

## 💻 Getting Started Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mardionfuertejr/ArtsyShop.git
   cd ArtsyShop/likha-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (`.env.local`):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ADMIN_EMAIL=mardionjrcordetafuerte@gmail.com
   ADMIN_PASSWORD=january2026
   GEMINI_API_KEY=your-gemini-key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) for the Storefront and [http://localhost:3000/admin](http://localhost:3000/admin) for the Admin Workspace.

---

## 🚀 Deployment

The project is optimized for deployment on **Vercel** with **Supabase** as the database backend. All assets and environment variables are pre-configured for seamless production turnover.
