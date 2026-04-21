---
marp:true

---


# Tech Stack Explained: A Simple Guide

This document breaks down the "FindInCampus" technology stack in simple, everyday language. Use this to easily explain your technical choices to judges, non-technical audiences, or teammates during your presentation.

---

## 🎨 The Frontend (What the user sees and interacts with)

The frontend is the face of the application—the buttons you click, the text you read, and the maps you interact with.

### 1. HTML5 (The Skeleton)
*   **What it is:** The standard language used to create web pages.
*   **Why we used it:** It provides the basic structure. Without HTML, there is no webpage. Everything starts here.
*   **How it works:** Think of it like the wooden frame of a house. It tells the web browser where the walls (sections), doors (buttons), and windows (images) are located, even if they aren't painted yet.

### 2. CSS3 & Vanilla CSS (The Paint & Interior Design)
*   **What it is:** The styling language of the web. "Vanilla" means we wrote it ourselves from scratch without relying on heavy third-party templates.
*   **Why we used it:** To make our app look modern, beautiful, and unique. Writing it ourselves kept our application lightning fast. We used cool effects like "Glassmorphism" (making menus look like sleek, frosted glass) to give a premium feel.
*   **How it works:** If HTML is the house frame, CSS is the paint, wallpaper, and lighting. It takes a boring, plain text button and makes it a glowing rounded shape that reacts when you hover over it.

### 3. JavaScript / Vanilla JS (The Brain & Muscles)
*   **What it is:** The programming language that breathes life into the web page. "Vanilla" again means we didn't use big, complex frameworks—we kept it pure and simple.
*   **Why we used it:** To make the site interactive. We need JavaScript to open up chat boxes, submit forms, or switch between "Lost" and "Found" tabs without refreshing the whole page.
*   **How it works:** It constantly listens for user actions. When you click "Submit Claim", JavaScript is the muscle that catches that click, gathers the info you typed, and decides what should appear on the screen next.

### 4. LocalStorage / Mock API (The Temporary Notebook)
*   **What it is:** A feature built into all modern web browsers that lets us save data locally right on the user's computer.
*   **Why we used it:** We used this as a "fake backend" (Mock API) so our frontend could be fully tested and demonstrated immediately, without needing a real server setup.
*   **How it works:** When someone reports a lost item, instead of sending it across the internet to a server, we just write it down in the browser's "Local Storage notebook." When they refresh the page, the browser checks that notebook and loads the item back onto the screen!

---

## ⚙️ The Backend (The Engine Room - Architecture Ready)

**Where is the backend right now?**
Currently, exactly as intended, our application operates in a **"Frontend-First"** state for rapid prototyping. The real "backend" logic is being temporarily handled directly inside the frontend using a Mock API (`frontend/api/client.js`) and the browser's LocalStorage. This makes the app incredibly easy to demo instantly to judges without needing any complex server setups.

**So why do we have a backend folder with only a package.json?**
The backend folder contains our **Blueprint**. Behind the scenes, our project is fully "Architecture Ready." We have set up our `package.json` with all the critical dependencies ready to go. When we need to scale to a full server architecture, the foundation is already built to drop the Mock API and plug right into the technologies below:

### 1. Node.js (The Operating Environment)
*   **What it is:** A tool that lets us run JavaScript code on a server computer instead of just inside a web browser.
*   **Why we used it:** It allows our team to write both the frontend and the backend using the exact same language (JavaScript). This makes development much faster and easier to manage.
*   **How it works:** Normally, JavaScript runs locally on your phone or laptop to make a webpage look nice. Node.js takes that same language and puts it on a heavy-duty server to do heavy-duty tasks like managing files and talking to databases.

### 2. Express.js (The Traffic Cop)
*   **What it is:** A framework built on top of Node.js that makes creating web servers very easy.
*   **Why we used it:** It is the industry standard for organizing a Node.js backend. It keeps everything neat.
*   **How it works:** Imagine a huge phone switchboard. When a user’s app sends a request saying "Give me all the lost items!", Express.js answers the call, figures out exactly what the user wants, and directs the request to the correct part of our code.

### 3. TypeScript (The Code Spell-Checker)
*   **What it is:** A specialized version of JavaScript that enforces strict rules.
*   **Why we used it:** It acts like an incredibly smart spell-checker that spots bugs in our logic *before* we even run the code. It makes our server highly reliable and difficult to break.
*   **How it works:** In regular JavaScript, you could accidentally tell the code to add the number `5` to the word `"apple"`, and the code might break later. TypeScript catches you while you're typing and says, "Hey! You can't mix numbers and text here!" and forces you to fix it instantly.

### 4. SQLite / libSQL & Prisma (The Filing Cabinet & The Assistant)
*   **What it is:** SQLite is a simple database. Prisma is an Object-Relational Mapper (ORM), which is essentially a translator between our code and our database.
*   **Why we used it:** SQLite is incredibly lightweight and perfect for starting out. Prisma makes talking to our database effortless because we don't have to write confusing SQL database commands.
*   **How it works:**
    *   **The Database (SQLite):** This is the massive filing cabinet where we store everything: User accounts, passwords, chat messages, and lost item tickets.
    *   **The ORM (Prisma):** This is our incredibly fast assistant. Instead of us having to walk to the filing cabinet and manually search through folders using complex database commands, we just ask Prisma in simple code: `"Hey Prisma, get me User #123"`. Prisma runs off, finds the file, and hands it right back to us.
