# OmniPOS & E-Commerce Web Module - Project Handover & Context

**Hello! You are assisting me with my enterprise application, OmniPOS.**
OmniPOS consists of a main physical POS system (Electron/React/Vite) and an integrated E-Commerce Web Module (Next.js). Both share a centralized Node.js/Express backend and a PostgreSQL (Neon) database.

## 🛑 INSTRUCTIONS FOR AI
1. Read the "Current Codebase Status" section below to understand exactly what is currently built and functioning.
2. **Wait for me to upload two `repomix` files:**
   - The main `OmniPOS` backend/POS repomix file.
   - The `OmniPOS/website` frontend repomix file.
3. Once I upload both files, carefully scan the codebase to understand the exact current architecture, database schema, and active routes.
4. After analyzing the uploaded files, you MUST reply exactly with:
   *"I have successfully analyzed your OmniPOS and Website repomix files. I see the current status of the main project and side project. What do you want to start updating from now on?"*

---

## 🛠️ Tech Stack & Architecture
- **Web Frontend (E-Commerce):** Next.js 14+ (App Router), React, Tailwind CSS, Zustand, Axios, Lucide React.
- **POS Frontend (Physical Store):** Electron, Vite, React, Redux Toolkit, Dexie.js (Offline-first IndexedDB).
- **Backend:** Node.js, Express, JSON Web Tokens (JWT), Multer + Cloudinary (Image hosting).
- **Database:** PostgreSQL (Hosted on Neon).

---

## 🚀 Current Codebase Status & Latest Achievements

### 1. Advanced E-Commerce Web Features (Next.js)
- **Live Invoice/Quotation Editor:** Built an advanced drag-and-drop canvas editor (`website/src/app/admin/invoices/[id]/page.tsx`) allowing admins to visually design A4 invoices and thermal receipts using absolute positioning, custom fonts, and data variables.
- **Quotation Generator:** Fully functional quote builder (`admin/quotations`) with custom pricing overrides, client details, and instant PDF generation.
- **Customer Portal:** Implemented a global Notification dropdown, Wishlist system synced to the DB, and User Authentication (Register/Login).
- **Dynamic Theming:** The Web module dynamically fetches theme colors (Primary, Navbar, Sidebar, Text) from the backend database via `ThemeProvider.tsx`.
- **Voucher Engine:** Created a public/private voucher system with visual pop-ups for unclaimed vouchers on the storefront.

### 2. Physical POS Terminal Features (React/Vite)
- **Offline-First Auto-Sync:** POS runs offline using Dexie.js and automatically syncs orders, products, and customers to the cloud when internet is restored (`AutoSync.tsx`).
- **CFD (Customer Facing Display):** Dual-screen setup communicating via `BroadcastChannel`. Shows live cart updates, promotional banners, and allows customers to input their digital receipt preferences (Email/SMS/WhatsApp).
- **Live Integrations Panel:** A unified dashboard to manage API keys for WhatsApp, Email (Brevo), and SMS providers (Text.lk, Twilio, Plivo, Bird).
- **Hardware Integration:** Global barcode scanner hook (`useGlobalScanner`) that intercepts scanner inputs seamlessly.

### 3. Centralized Backend & Database Engine
- **Refund Lifecycle:** Backend handles both full and partial refunds protected by SQL transactions. Updates order status, adjusts inventory stock levels, and reverses loyalty points securely.
- **Gross vs. Net Analytics:** The `dashboardController.js` accurately splits Gross Revenue from Net Revenue by factoring in processed refunds.
- **Database Management:** Built endpoints to fully export the DB to JSON, and securely truncate/restore the DB from a backup file handling foreign key constraints safely.