# OmniPOS — Modern Point of Sale System

OmniPOS is a modern Point of Sale (POS) system built using **React, Vite, TypeScript, Node.js, and PostgreSQL**, designed for retail environments that require fast sales processing, inventory control, and reliable performance.

The system focuses on simplicity, speed, and scalability while maintaining a clean and modern user experience.

---

## 🚀 Overview

OmniPOS is designed to handle daily store operations including:

* Product and inventory management
* Sales transactions
* Payment recording
* Supplier management
* Reporting and analytics
* Offline-friendly POS workflow
* Scalable backend architecture

The system is suitable for small to medium retail businesses and can be extended into multi-branch environments.

---

## ✨ Features

### POS & Sales

* Fast product search and billing
* Cart-based checkout system
* Multiple payment methods:

  * Cash Hand Over
  * Bank Slip
  * Bank Transfer
* Invoice generation
* Daily transaction tracking

### Inventory Management

* Product stock management
* Supplier-based product tracking
* Automatic quantity updates after sales
* Damage item reporting

### Supplier Management

* Supplier records
* Product supply tracking
* Quotation and balance reporting

### Reporting

* Sales reports
* Supplier reports
* Inventory summaries
* Payment records

### System Features

* Responsive UI
* Offline-ready design (IndexedDB support in earlier versions)
* Backend API integration
* Scalable PostgreSQL database structure

---

## 🧱 Tech Stack

### Frontend

* React
* Vite
* TypeScript
* Modern CSS UI

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL

---

## 📁 Project Structure

```
OmniPOS/
│
├── frontend/        # React + Vite + TypeScript
├── backend/         # Node.js API server
├── database/        # Database schema & migrations
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/inblognet/OmniPOS.git
cd OmniPOS
```

---

### 2️⃣ Install Dependencies

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
npm install
npm run dev
```

---

### 3️⃣ Environment Variables

link to that to download the .env file https://drive.google.com/drive/folders/1EJWXzcO_S2hfcqUG87KSeyXh0kDvh7eM?usp=sharing 
Paste it on the /backend Folder
Create a `.env` file inside the backend folder:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
```

Example:

```
postgresql://username:password@host:port/database
```

---

## 🗄️ Database

OmniPOS uses PostgreSQL for managing:

* Products
* Sales
* Suppliers
* Payments
* Reports

The backend connects directly using the provided database connection string.

---

## 🌐 Deployment

Recommended deployment setup:

| Layer    | Platform          |
| -------- | ----------------- |
| Frontend | Netlify / Vercel  |
| Backend  | Render            |
| Database | Render PostgreSQL |

---

## 📌 Roadmap

* User authentication & role management
* Multi-branch support
* Advanced analytics dashboard
* Export reports (PDF / Excel)
* Cloud sync improvements
* Mobile POS interface

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome. Please open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.
