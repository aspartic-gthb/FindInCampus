<div align="center">
  <img src="./frontend/assets/images/favicon 1.png" alt="FindInCampus Logo" width="120" />
  <h1>🔍 FindInCampus</h1>
  <p><strong>Intelligent, Secure, & Map-Integrated Lost & Found for Campus Ecosystems</strong></p>

  <p>
    <a href="#-project-overview">Overview</a> •
    <a href="#-key-features">Features</a> •
    <a href="#%EF%B8%8F-technology-stack">Tech Stack</a> •
    <a href="#-getting-started-local-development">Installation</a> •
    <a href="#-future-prospects-roadmap">Roadmap</a>
  </p>
</div>

<hr/>

## 📖 Project Overview

**FindInCampus** is a modern, responsive platform designed specifically for university and college campuses to solve the age-old problem of lost items. By combining geolocation, intelligent matching algorithms, and secure verification workflows, FindInCampus transforms the chaotic process of managing lost and found into a seamless, trusted digital experience.

This project delivers a robust, end-to-end framework starting from secure reporting to final item resolution, empowering users to securely claim what belongs to them or return what they've found.

## ✨ Key Features

- 📍 **Interactive Map Integration:** Drop exact location pins for items lost or found using seamless map API integration. Visualize hotspots with a dedicated Heatmap feature to identify high-risk areas.
- 🧠 **Intelligent Item Matching:** Built-in semantic heuristics compare categories, descriptions, and metadata to auto-recommend correlations between lost and found tickets.
- 🔒 **Secure Resolution Workflow:** An end-to-end "Claim" system where finders and owners can securely communicate, verify ownership via detailed proofs, and permanently update statuses upon resolution.
- 💬 **Integrated Secure Chat:** Designed a peer-to-peer messaging system specifically adapted to handle item claims privately and offload public listing exposure.
- ⚡ **Offline-Ready Architecture:** The frontend features an injected modular `localStorage` mock engine in `api/client.js`, allowing the app to run completely in the browser for rapid testing and demonstrations with zero backend dependencies, while exposing standard asynchronous interfaces for a smooth transition to a live backend.
- 🎨 **Modern & Responsive UI/UX:** A rich, polished user interface built with customized vanilla CSS, utilizing glassmorphism, dynamic animations, and beautifully crafted layouts without relying on heavy UI libraries.

## 🛠️ Technology Stack

<div align="center">
  <img src="https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E" alt="JavaScript" />
  <img src="https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB" alt="Express.js" />
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
</div>

<br/>

**Frontend**
- **Core:** HTML5 & CSS3 (Semantic markup and custom design systems)
- **Logic:** ES6+ JavaScript (Vanilla JS for state management, routing, & interactive UI)
- **APIs:** Location tracking and geographic mapping
- **Architecture:** Client Mock API simulating backend interaction via `localStorage`

**Backend (Architecture Ready)**
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database & ORM:** libSQL / SQLite with Prisma ORM

## 📂 Project Structure

```text
LostnFound/
├── frontend/
│   ├── index.html           # Landing page
│   ├── item-list.html       # Explore lost/found items
│   ├── item-detail.html     # Detailed view & claim submission
│   ├── report-form.html     # Create new item listings
│   ├── heatmap.html         # Interactive map view of item hotspots
│   ├── my-reports.html      # User dashboard & ticket management
│   ├── api/
│   │   └── client.js        # Mock backend / Asynchronous API interface
│   ├── styles/
│   │   └── common.css       # Global styles & robust design system
│   └── assets/              # Images, icons, and static assets
├── backend/
│   ├── package.json         # Node.js dependencies
│   ├── .env.example         # Environment variable template
│   └── ...                  # Server-side controllers and models
└── README.md
```

## 🚀 Getting Started (Local Development)

### Running the Frontend (Browser Demo)
Since the application uses an encapsulated mock API client leveraging `localStorage`, you can test the entire user flow right in your browser!

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aspartic-gthb/FindInCampus.git
   cd FindInCampus
   ```
2. **Launch with a Local Web Server:**
   Using a tool like VSCode Live Server, `http-server`, or Python:
   ```bash
   # Using Python 3
   cd frontend
   python -m http.server 8000
   ```
3. **Access the Application:**
   Navigate to `http://localhost:8000` in your preferred web browser.

### Initializing the Backend (API Service)
The backend architecture is set up for rapid scaling utilizing Prisma & LibSQL.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
4. **Start the development server:**
   ```bash
   npm run dev
   ```

## 🔮 Future Prospects (Roadmap)

As we continue developing and scaling this platform for actual campus deployment, the roadmap includes:

1. **AI-Powered Image Recognition:** Automatically tag and categorize items using Vision AI on user-uploaded images to detect color, brand, and item type without requiring manual text entry.
2. **University SSO Integration:** Restrict portal access exclusively to verified students and faculty using the university’s active directory (CAS/SAML/OAuth) for enhanced security and trust.
3. **Real-time Notifications:** Implement WebSockets and Push APIs for real-time alerts when a potential match arises or a claim is dynamically updated.
4. **Native Mobile App:** Build iOS and Android versions using React Native or Flutter to leverage native push notifications, background geolocation services, and instant camera access.
5. **Community Bounty System:** A gamified feature allowing users to optionally attach small rewards or bounties to their high-value lost items to further incentivize community participation.

## 🤝 Contributing
Contributions, bug reports, and feature requests are welcome!
Feel free to check out the [issues page](../../issues) to see how you can help.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---
<div align="center">
  <i>Built with ❤️ for Campus Communities</i>
</div>
