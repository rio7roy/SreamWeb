# STREAM Ecosystem Portal

A full-stack, multi-role educational portal designed to manage programs, events, users, and administrative tasks across the STREAM (Science, Technology, Reading, Engineering, Arts, Mathematics) ecosystem.

**🌐 Live Website:** [https://sreamweb-front.onrender.com](https://sreamweb-front.onrender.com)

## 🏗️ Architecture & Tech Stack

This project is structured as a monolithic repository (monorepo) using npm workspaces, separating the `client` and `server` while sharing configurations.

### Frontend (`/client`)
- **Framework**: React 18 (with Hooks)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v3
- **Routing**: React Router DOM v6
- **State Management & Data Fetching**: React Context API, Axios
- **UI Components**: Custom components built with Tailwind, Lucide React (Icons), React Datepicker
- **Image Cropping**: React Easy Crop

### Backend (`/server`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Local File-based JSON Database (No external SQL/NoSQL dependencies required for local development. Data is persisted in `/server/data/*.json`)
- **Authentication**: JSON Web Tokens (JWT), bcrypt (password hashing), Custom RBAC Middleware
- **Validation**: Zod (Shared schemas between frontend and backend)
- **File Uploads & Processing**: Multer, Sharp (Image compression and formatting)
- **Report Generation**: PDFKit (PDF reports), ExcelJS (Excel spreadsheets)
- **Real-time**: Socket.IO

---

## 🛠️ Prerequisites

To run this project locally, ensure you have the following installed on your system:
- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher (comes with Node.js)
- **Git**: For version control and cloning

*Note: Since the project uses a localized JSON-based data store for high portability, you DO NOT need to install or configure PostgreSQL, MongoDB, or any other external database system to get started.*

---

## 🚀 Getting Started

Follow these instructions to set up the project on your local machine for development and testing purposes.

### 1. Clone the Repository
```bash
git clone https://github.com/rio7roy/SreamWeb.git
cd SreamWeb
```

### 2. Install Dependencies
Run the install command from the root of the project to install both client and server dependencies using npm workspaces.
```bash
npm install
```

### 3. Configure Environment Variables
Navigate to the `server` directory and configure the environment variables:
```bash
cd server
cp .env.example .env
```
Ensure your `.env` contains the necessary secrets (e.g., `JWT_SECRET`). The default configuration uses an in-memory/file-based database, so no database URI is needed.

### 4. Start the Development Servers
From the root of the project, you can start both the frontend and backend concurrently:
```bash
npm run dev
```
- **Backend (API)**: Running on `http://localhost:5000`
- **Frontend (Client)**: Running on `http://localhost:5173`

*To start them individually:*
```bash
npm run dev:server    # Starts only the Express backend
npm run dev:client    # Starts only the Vite frontend
```

---

## 🔑 Demo Accounts & Portals

The platform supports multiple Role-Based Access Control (RBAC) portals. When you start the server, demo accounts are automatically seeded into the local JSON data store.

You can log in using the following credentials:

| Portal Role | Default Email / Username | Password |
|---|---|---|
| **Admin** | admin@stream.edu | Admin@123 |
| **STREAM Expert** | expert@stream.edu | Demo@123 |
| **STREAM Hub** | lab@stream.edu | Demo@123 |
| **iLab Corner** | ilab@stream.edu | Demo@123 |
| **Creative Corner** | creative@stream.edu | Demo@123 |

*(Additionally, 87 unique Hub credentials have been pre-seeded for individual BRCs. Refer to `server/data/hub_credentials.csv` for the full list).*

---

## 📦 Core Features & Modules

### 1. Multi-Portal Routing
- Automatically routes users to their respective dashboards based on their RBAC role upon login.
- Supports a "Remember Me" feature to securely save and autofill identifiers and passwords per portal.

### 2. Admin Dashboard
- **Analytics & Statistics**: High-level overviews of total footprint, students, teachers, and events.
- **Event Reports**: Differentiates between standard "Programs Conducted" by experts and "Separate Hub Events" uploaded by BRCs.
- **User Management**: Create, edit, and deactivate users. Manage role assignments.
- **Broadcast System**: Push global notifications and announcements to specific roles.
- **Stock Administration**: 
  - **Comprehensive Management**: View and manage the inventory of different Hubs, export reports, and compare stock allocations.
  - **Intelligent Bulk Uploads**: CSV upload system that automatically identifies duplicates, matches existing items by `uniqueId`, and smartly increments stock quantities without duplicating database entries.
  - **Cascading Assignments**: Auto-filters and syncs BRC selection lists based on dynamically selected Districts to ensure accurate inventory assignment.
  - **Location Formatting**: Distinct `Location/Name` displays across all stock tables, dropdowns, and comparison tools to ensure clarity when multiple BRCs share similar names.
- **Report Exports**: Generate and download deeply formatted PDF and Excel reports for all ecosystem activities.

### 3. Event & Attendance Tracking
- **Expert Portal**: Experts can log detailed daily events, specifying the BRC, footprint (student/teacher count), tags, descriptions, and up to 10 compressed photos.
- **Hub Portal**: Hub administrators can explicitly upload PDF reports to existing events or quickly create and attach reports to entirely new events on the fly.
- **Geolocation**: Events can capture GPS coordinates when logged from mobile devices.

### 4. Forms & Resource Management
- **Dynamic Forms**: Admins can construct and distribute dynamic forms (Checkboxes, Text, Radio) to gather specific data from Hubs or Experts.
- **File Management**: Built-in support for uploading avatars, PDF documents, and image galleries. Images are automatically compressed using `sharp` to save bandwidth and storage.

---

## 📂 Project Structure

```text
stream-ecosystem/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable and role-specific UI components
│   │   ├── features/       # React Context providers (AuthContext)
│   │   ├── lib/            # Axios API configurations
│   │   ├── pages/          # Full page views (Admin, Expert, Hub dashboards)
│   │   └── index.css       # Tailwind entry and global styles
│   └── package.json
├── server/                 # Express Backend
│   ├── data/               # Persistent JSON files (events, users, brcs, stocks)
│   ├── src/
│   │   ├── middleware/     # Auth (JWT), Uploads (Multer/Sharp), Validation
│   │   ├── modules/        # Domain-driven feature modules (auth, events, reports, users)
│   │   └── server.js       # Express app entry point
│   ├── uploads/            # Uploaded static assets (avatars, PDFs, event photos)
│   └── package.json
├── shared/                 # Shared logic (Zod validation schemas)
└── package.json            # Root workspace config
```
