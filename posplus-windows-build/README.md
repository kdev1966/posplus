# 🛒 POSPlus - Point of Sale System

<div align="center">

![POSPlus Logo](https://img.shields.io/badge/POSPlus-v1.0.0-blue?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-28.0-47848F?style=for-the-badge&logo=electron)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Modern, offline-first Point of Sale system built with Electron, React, and SQLite**

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Documentation](#documentation)

</div>

---

## ✨ Features

### 🎯 Core Features
- **💻 Offline-First** - Works without internet, data stored locally in SQLite
- **🛒 Complete POS** - Barcode scanning, product grid, cart management
- **💰 Cash Sessions** - Open/close sessions with cash counting
- **🧾 Receipt Printing** - ESC/POS thermal printer support
- **📊 Reports** - Z-reports, sales reports, stock reports
- **👥 User Management** - Role-based access control (Admin, Manager, Cashier)
- **📦 Inventory** - Stock management with low-stock alerts
- **🔐 Secure** - Bcrypt password hashing, context isolation

### 🎨 Modern UI/UX
- **Glassmorphism Design** - Beautiful glass effects with backdrop blur
- **Neon Accents** - Vibrant neon colors (blue, purple, pink, green)
- **Dark Mode** - Dark theme optimized for long sessions
- **Responsive** - Works on different screen sizes
- **Smooth Animations** - Fluid transitions and animations

### 🏗️ Technical Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Electron, Node.js, better-sqlite3
- **Printer**: node-thermal-printer (ESC/POS)
- **Testing**: Jest, ts-jest
- **Build**: Vite, Electron Builder

---

## 📋 Requirements

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Windows 10/11**, **macOS 11+**, or **Linux**
- **Thermal Printer** (optional, ESC/POS compatible)

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/posplus.git
cd posplus

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

This will:
1. Start Vite dev server on http://localhost:5173
2. Launch Electron with hot-reload enabled
3. Open DevTools automatically

### Build

```bash
# Build for production
npm run build

# Package for Windows
npm run package:win

# Package for macOS
npm run package:mac

# Package for Linux
npm run package:linux
```

---

## 📖 Usage

### First Login

Default credentials:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Change the password immediately after first login!**

### Opening a Cash Session

1. Go to **Settings**
2. Enter opening cash amount (e.g., €100.00)
3. Click **Open Session**

### Making a Sale

1. Go to **Point of Sale** (POS)
2. Select products or scan barcodes
3. Items are added to cart
4. Click **Checkout**
5. Select payment method (Cash, Card, Mixed)
6. Confirm payment
7. Receipt prints automatically

### Closing a Session

1. Go to **Settings**
2. Enter closing cash amount
3. Click **Close Session**
4. System calculates difference
5. Z-Report is generated automatically

---

## 🗂️ Project Structure

```
posplus/
├── src/
│   ├── electron/              # Backend (Main Process)
│   │   ├── main.ts            # Entry point
│   │   ├── preload.ts         # IPC Bridge
│   │   ├── handlers/          # IPC Handlers
│   │   └── services/
│   │       ├── auth/          # Authentication
│   │       ├── database/      # SQLite + Repositories
│   │       ├── printer/       # ESC/POS Printer
│   │       ├── sync/          # Cloud Sync (WIP)
│   │       └── ticket/        # Ticket Service
│   │
│   ├── renderer/              # Frontend (Renderer Process)
│   │   ├── pages/             # React Pages
│   │   ├── components/        # React Components
│   │   ├── store/             # Zustand Stores
│   │   ├── styles/            # Global Styles
│   │   └── App.tsx
│   │
│   └── shared/                # Shared Types & Constants
│       ├── types/
│       └── constants/
│
├── build/                     # Build assets
├── release/                   # Packaged apps
└── docs/                      # Documentation
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

---

## 🗄️ Database Schema

POSPlus uses **SQLite** with the following main tables:

- `users` - User accounts
- `roles` - User roles & permissions
- `products` - Product catalog
- `categories` - Product categories
- `tickets` - Sales transactions
- `ticket_lines` - Transaction line items
- `payments` - Payment records
- `cash_sessions` - Cash session tracking
- `stock_logs` - Inventory movements
- `z_reports` - End-of-day reports

---

## 🔐 Security

- **Context Isolation**: Enabled
- **Node Integration**: Disabled in renderer
- **Sandbox**: Enabled
- **Password Hashing**: Bcrypt (10 rounds)
- **IPC**: Whitelisted channels only via contextBridge

---

## 🖨️ Printer Setup

### Supported Printers

POSPlus supports ESC/POS compatible thermal printers:
- Epson TM series
- Star Micronics
- Generic ESC/POS printers

### USB Setup

1. Connect printer via USB
2. Install printer drivers
3. POSPlus will auto-detect the printer

---

## 📊 Reports

### Z-Report (End of Day)

Generated automatically when closing a session:
- Total sales
- Payment methods breakdown
- Tax summary
- Cash variance

### Sales Report

- Daily, weekly, monthly sales
- Top-selling products
- Category performance

### Stock Report

- Current stock levels
- Low stock alerts
- Stock movement history

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## 🛠️ Development

### Code Style

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Database Migrations

Migrations are in `src/electron/services/database/migrations/`

New migrations run automatically on app start.

---

## 🚧 Roadmap

- [x] Core POS functionality
- [x] Offline SQLite database
- [x] Receipt printing (ESC/POS)
- [x] User roles & permissions
- [x] Cash session management
- [x] Z-Reports
- [ ] Cloud synchronization
- [ ] Customer management
- [ ] Loyalty program
- [ ] Multi-currency support
- [ ] Advanced analytics

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **POSPlus Team** - Initial work

---

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [node-thermal-printer](https://github.com/Klemen1337/node-thermal-printer)

---

<div align="center">

**Made with ❤️ by POSPlus Team**

</div>
