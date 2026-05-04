# 🌌 3D Code Playground

A premium, full-stack interactive coding environment that allows users to write JavaScript and visualize the output in real-time. Built with a focus on 3D graphics, this platform features an integrated execution engine that safely renders Three.js scenes and GSAP animations directly from user-submitted code.

## ✨ Features
* **Live 3D Execution:** Secure iframe sandboxing to render Three.js and execute JavaScript safely.
* **Cinematic UI:** A sleek, responsive glassmorphism interface powered by Tailwind CSS v3 and GSAP.
* **Advanced Editor:** Integrated Monaco Editor with syntax highlighting and pre-built 3D templates.
* **Save & Share:** A Node.js/Express backend connected to MongoDB that generates unique, sharable URLs for user snippets.
* **Local Export:** Generate and download standalone HTML files of your 3D scenes directly from the browser.

## 🛠️ Tech Stack
* **Frontend:** React, Vite, Tailwind CSS v3, GSAP, Three.js, Monaco Editor
* **Backend:** Node.js, Express.js, MongoDB (Mongoose)

## 🚀 Local Installation

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/yourusername/code-playground-3d.git
cd code-playground-3d
\`\`\`

### 2. Setup the Backend
\`\`\`bash
cd backend
npm install
\`\`\`
Create a `.env` file in the `backend` directory and add your MongoDB URI:
\`\`\`env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/CodePlaygroundDB
PORT=5000
\`\`\`
Start the backend server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Setup the Frontend
Open a new terminal window:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
The application will be running at `http://localhost:5173`.