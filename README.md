# MARVEL TIN S.A / ZIM Fleetbase

> Cross-border logistics, telematics, and heavy-haulage fleet operations command center for **MARVEL TIN S.A / ZIM**. Engineered for high-value mineral transport (tin ore concentrates, bulk freight) across Southern African transit corridors connecting Zimbabwe, South Africa, Botswana, and Zambia.

---

## 📋 Overview

**MARVEL TIN Fleetbase** is a comprehensive, production-grade Fleet Operations & Transportation Management System (TMS). It provides end-to-end visibility across corridor dispatches, real-time vehicle telematics, multi-currency accounting, driver float reconciliation, workshop tyre/mechanical maintenance, and border gate customs dwell tracking.

The application is architected with strict departmental isolation—ensuring dispatchers, accountants, maintenance managers, and long-haul drivers have focused, decluttered interfaces tailored specifically to their operational roles.

---

## 🚀 Key Modules & Departmental Screens

### 1. 🚚 Orders Board & Corridor Dispatches
- **Kanban Dispatch Pipeline**: Track loads across operational stages (`Planning`, `Dispatched`, `In Transit`, `Border Customs`, `Delivered / POD Received`, `Completed`).
- **Load Specifications**: Freight cargo details (e.g., 32 MT Tin Ore Concentrate), agreed ton-rates, customs manifest references (CD3), customer consignment orders, and seal numbers.
- **Driver Dispatch Actions**: Instant WhatsApp dispatch generation with corridor transit instructions, waypoint stops, and customs manifests.
- **Customs Dossier**: One-click generation of cross-border customs packs containing commercial invoices, consignment notes, transit declarations, and driver credentials.

### 2. 🛰️ Corridor Telematics & Live Fleet Map
- **Live GPS Tracking**: Real-time beacon tracking for prime movers (Scania R500 `JRB 216MP`, Volvo FH16 `KBR 813MP`) along North-South freight routes.
- **Telematics Metrics**: Real-time speed, heading, GPS accuracy, ping history, odometer readings, and driver phone beacon transmission.
- **Corridor Geofencing & Rest Stops**: Inspection gates, weighbridges, fuel depots, and secure overnight truck stops between Durban, Beitbridge, Harare, Chirundu, and Lusaka.

### 3. 💵 Financial Center & TMS Accounting
- **TMS Load Settlement Register**: Auditing carrier units, customer accounts (African Mineral Traders, ZimMetals Ltd), agreed freight revenue, and payment aging.
- **Official Tax Invoices**: Automated commercial tax invoice generation with SARS/ZIMRA compliance, VAT/Zero-rated export handling, banking details, and printable PDF layouts.
- **Payment & Voucher Auditing**: Audit queue for approving fuel slips, road expense vouchers, and attaching Proof of Payments (POPs).
- **General Ledger Synchronization**: Live debit/credit tracking against trip revenue and route operational disbursements.

### 4. 📈 Trip Margins & Border Dwell Tracking
- **Cost-Per-Kilometre (CPK) Analytics**: Real-time margin calculations comparing gross revenue against diesel consumption, road disbursements, and maintenance wear.
- **Border Gate Dwell Tracker**: Live status monitoring at major border posts:
  - **Beitbridge** (SA ↔ ZIM)
  - **Chirundu** (ZIM ↔ ZAM)
  - **Plumtree** (ZIM ↔ BWP)
- **Customs Inspection Stages**: Track `Gate Queuing`, `CD3 Customs Inspection`, and `Cleared Customs` with dwell time counters.

### 5. ⛽ Fuel History & Consumption
- **Diesel Purchases**: Record litres pumped, odometer readings, pump rates, and filling stations (Total Beitbridge, Puma Musina, Engen Chirundu, Shell Harare).
- **Fleet Efficiency**: Automated burn rate metrics ($L/100\text{km}$ and $km/L$) per vehicle and route segment.
- **Receipt Capture**: High-resolution receipt viewer with client-side image downscaling and direct PDF download.

### 6. 🧾 Route Expenses & Road Disbursements
- **Corridor Cost Categories**: Toll gates (SANRAL & ZINARA), cross-border permits, carbon tax, weighbridge fees, transit clearing runner fees, and driver daily stipends.
- **Audit Trails**: Voucher status tags (`Under Review`, `Audited & Approved`, `Flagged`), currency breakdown, and receipt attachments.

### 7. 👛 Petty Cash & Cash Float Reconciliation
- **Driver Cash Floats**: Real-time float balance calculation for each truck unit.
- **Reconciliation Engine**: Dynamic reconciliation pairing top-up disbursements directly against submitted route expense deductions to prevent float leakage.
- **Reconciliation Reports**: Verified match reporting between physical cash advances and expense collection logs.

### 8. 🔧 Tyres & Mechanical Maintenance
- **6x4 Tri-Axle Tracking**: Workshop service records for heavy-haul trucks and tri-axle flatdeck/bulk trailers.
- **Service Categories**: Scheduled oil/filter services, tyre rotations & casing replacements, brake relining, air suspension repairs, and emergency road assistance.
- **Service Intervals**: Odometer-based alerts and workshop location logs (Harare Central Workshop, Musina Commercial Fleet Repairs).

### 9. 📊 Tax & Compliance Reports
- **Multi-Filter Generator**: Date range filters (`Today`, `Last 7 Days`, `Last 30 Days`, `This Month`, `Custom Period`) combined with corridor and vehicle filters.
- **Data Export Formats**: Instant CSV exports, ExcelJS workbooks, and print-ready executive audit summaries.

### 10. 📁 Files, Waybills & Proof of Payments (POPs)
- **Document Management**: Secure repository for Waybills, Delivery Notes (PODs), CD3 Customs forms, Weightbridge Tickets, and Bank POPs.
- **Media Optimization**: Integrated canvas-based media optimizer reducing 5–15 MB mobile camera uploads down to ~150–300 KB without sacrificing text legibility.

### 11. 📱 Driver In-Cab Console
- **Mobile-First Experience**: High-contrast, tactile interface designed for in-cab operation on mobile devices.
- **Driver Telematics**: Background phone GPS transmission for real-time location pings.
- **Fast Action Capture**: Simplified logging for refuel stops and unexpected border expenses.

---

## 💱 Multi-Currency Architecture

The Southern African logistics corridor relies on multi-currency operations across borders:
- **USD ($)**: Regional primary benchmark currency for freight contracts and customs valuations.
- **ZAR (R)**: South African Rand (fuel and transit expenses in SA).
- **BWP (P)**: Botswana Pula.
- **ZMW (K)**: Zambian Kwacha.

All accounting views and margin calculations dynamically convert values into USD or ZAR using real-time and fallback exchange rates (`ZAR_USD`, `BWP_ZAR`, `ZMW_ZAR`).

---

## 🔒 Security & Role-Based Access Control (RBAC)

The system implements strict Role-Based Access Control backed by Firebase Authentication and Firestore security rules:

| Role | Access Level | Primary Scope |
| :--- | :--- | :--- |
| **Executive Administrator** | Full Read & Write | All fleet units, financial ledgers, system settings, exchange rates, and user roles |
| **Fleet Accountant / Controller** | Finance & Audit Read/Write | Invoices, P&L statements, petty cash floats, expense audit approvals, and GL exports |
| **Operations Dispatcher** | Logistics Read/Write | Orders board, vehicle dispatching, border tracking, tyre/maintenance schedules |
| **In-Cab Driver** | Isolated Truck Read/Write | Restricted strictly to their assigned vehicle registration (`JRB 216MP` or `KBR 813MP`) |

### Security Invariants
- **Strict Vehicle Isolation**: Drivers cannot read, update, or manipulate records belonging to another vehicle unit.
- **Role Elevation Prevention**: Drivers cannot modify their user document or self-assign admin roles.
- **Storage MIME Restrictions**: Uploads to storage buckets are restricted to `application/pdf` and image types (`image/*`).

---

## 🛠️ Technology Stack

- **Frontend Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide Icons, Motion
- **Maps & Telematics**: Leaflet, `@vis.gl/react-google-maps`
- **Document & Data Processing**: ExcelJS, JSZip
- **Backend & API**: Express, Node.js (`tsx`)
- **Database & Auth**: Google Cloud Firestore, Firebase Authentication, Firebase Storage

---

## 💻 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm or bun

### Installation
1. Clone the repository and enter the directory:
   ```bash
   git clone <repository-url>
   cd marvel-tin-fleet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` and supply your keys:
   ```bash
   cp .env.example .env
   ```
   Required keys:
   - `GEMINI_API_KEY`: Google GenAI API key (if leveraging AI assistants/automation)
   - `APP_URL`: The host URL of the deployment
   - `VITE_GOOGLE_MAPS_API_KEY`: Google Maps Platform API key for live mapping

### Running Locally
Start the development server:
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### Production Build
To create an optimized production build:
```bash
npm run build
```
To run the production server:
```bash
npm run start
```

### Type Checking & Linting
```bash
npm run lint
```

---

## 🚢 Deploying from GitHub

Yes, this project is fully structured for direct deployment from a GitHub repository. Because it includes an Express backend (`server.ts`) for Excel generation, ZIP packaging, healthchecks, and Gemini Maps Grounding, it deploys seamlessly to any containerized or Node runtime.

### Option 1: Google Cloud Run (Recommended Continuous Deployment)

Google Cloud Run is the native host for this application. It provides automatic HTTPS, scale-to-zero capabilities, and continuous deployment directly from your GitHub repository via Cloud Build.

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of MARVEL TIN Fleetbase"
   git branch -M main
   git remote add origin https://github.com/<your-username>/marvel-tin-fleet.git
   git push -u origin main
   ```

2. **Connect to Cloud Run**:
   - In Google Cloud Console, navigate to **Cloud Run** → **Create Service**.
   - Select **"Continuously deploy from a repository"** and click **Set Up with Cloud Build**.
   - Connect your GitHub provider and select your `marvel-tin-fleet` repository and `main` branch.
   - Build Type: **Dockerfile** (the repository already includes an optimized multi-stage production `Dockerfile`).
   - Authentication: Check **"Allow unauthenticated invocations"** (or configure IAP if internal only).
   - In **Variables & Secrets**, add your environment variables:
     - `PORT`: `8080` (automatically injected)
     - `VITE_GOOGLE_MAPS_API_KEY`: Your Google Maps Platform API key
     - `GEMINI_API_KEY`: Your Google Gemini API key
   - Click **Create**. Every push to `main` will automatically build and deploy a new revision.

---

### Option 2: Railway or Render (One-Click Git Deployment)

Both Railway and Render automatically detect the root `Dockerfile` or `package.json`:

#### Via Railway:
1. Log into [railway.app](https://railway.app) and select **New Project** → **Deploy from GitHub repo**.
2. Select your repository. Railway will detect the `Dockerfile` and build it automatically.
3. In the project **Variables** tab, set:
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `GEMINI_API_KEY`
4. Generate a public domain under **Settings** → **Networking**.

#### Via Render:
1. Log into [render.com](https://render.com) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Environment: **Docker** (or Node runtime with Build Command: `npm run build`, Start Command: `npm start`).
4. Add environment variables under the **Environment** tab.
5. Click **Create Web Service**.

---

### Option 3: Pre-configured GitHub Actions CI/CD

The repository includes a ready-to-use GitHub Actions workflow located at `.github/workflows/ci.yml`. On every push or pull request to `main`, GitHub Actions automatically:
- Installs dependencies using clean install (`npm ci`)
- Validates all TypeScript types (`npm run lint`)
- Builds the production Vite bundle (`npm run build`)

---

## 📁 Project Structure

```text
├── src/
│   ├── components/            # Dedicated views & modal dialogs
│   │   ├── AccountingDashboardView.tsx  # TMS Load Ledger & Financial Center
│   │   ├── DashboardOverview.tsx        # Executive KPIs & Financial Bars
│   │   ├── DriverCabConsole.tsx         # In-Cab Driver Interface
│   │   ├── FleetbaseBoard.tsx           # Kanban Orders Dispatch Board
│   │   ├── FleetbaseSidebar.tsx         # Navigation & Fleet Resources Rail
│   │   ├── FleetMap.tsx                 # Interactive Corridor Map
│   │   ├── FuelLogsView.tsx             # Diesel Purchases & Burn Rates
│   │   ├── ExpensesView.tsx             # Route Expenses & Voucher Auditing
│   │   ├── PettyCashView.tsx            # Driver Cash Float Ledger
│   │   ├── MaintenanceView.tsx          # Tyres & Mechanical Workshop
│   │   ├── ProfitAndBorderView.tsx      # Margins, P&L & Border Dwell
│   │   ├── GenerateReportView.tsx       # Audit Reports & Exports
│   │   ├── FilesView.tsx                # Waybills & POD Repository
│   │   ├── Header.tsx                   # Top Bar, FX Ticker & Role Switcher
│   │   └── MobileFAB.tsx                # Contextual Screen-Exclusive Action Button
│   ├── context/
│   │   ├── AuthContext.tsx              # RBAC & User Session Management
│   │   ├── FleetContext.tsx             # Live Firestore Subscriptions & State
│   │   └── ThemeContext.tsx             # Dark & Light Concept Theme Provider
│   ├── services/
│   │   └── seedService.ts               # Sample Corridor Fleet Data Seeder
│   ├── utils/
│   │   ├── helpers.ts                   # Date, Currency & DocID Utilities
│   │   ├── mediaOptimizer.ts            # Client-Side Image Compression
│   │   └── useNetworkStatus.ts          # Offline & Connectivity Detector
│   ├── App.tsx                          # Core Application Layout & Router
│   ├── index.css                        # Global Tailwind CSS Styles
│   └── main.tsx                         # Client DOM Mount
├── firestore.rules                      # Firestore Security & RBAC Rules
├── storage.rules                        # Storage MIME & Bucket Security Rules
├── security_spec.md                     # Security Threat Model & Invariants
├── server.ts                            # Express Server with Vite Middleware
├── metadata.json                        # Applet Manifest Metadata
└── package.json                         # Project Dependencies & Scripts
```

---

## 📄 License

Proprietary — Internal operations platform for **MARVEL TIN S.A / ZIM**. All rights reserved.
