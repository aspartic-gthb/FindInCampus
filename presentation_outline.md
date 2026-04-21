---
marp:true

---

# FindInCampus: Presentation Outline

This is a slide-by-slide outline designed to help you build out your PowerPoint presentation for the **FindInCampus** project. 

---

## Slide 1: Title Slide
* **Title:** FindInCampus
* **Subtitle:** Intelligent, Secure, & Map-Integrated Lost & Found for Campus Ecosystems
* **Presenter:** [Your Name / Team Name]
* **Visual Ideas:** FindInCampus Logo, perhaps a subtle map or generic campus background.

---

## Slide 2: The Problem Statement
* **Heading:** The Challenge of Lost Items on Campus
* **Bullet Points:**
  * **Scale & Chaos:** Campuses are large, bustling environments. Items are frequently lost, but reporting and finding them is highly disorganized.
  * **Fragmented Systems:** Students rely on WhatsApp groups, physical bulletin boards, or diverse administrative offices.
  * **Lack of Privacy:** Exposing personal contact details on public forums when trying to return or claim an item poses security risks.
  * **No Verification:** Anyone can claim a found item without a solid proof-of-ownership workflow.
* **Visual Ideas:** Icons illustrating confusion, lost items (keys, IDs, wallets), or a cluttered bulletin board.

---

## Slide 3: Our Approach
* **Heading:** A Centralized, Intelligent Solution
* **Bullet Points:**
  * **Digital Unification:** Create a single, accessible platform dedicated exclusively to managing campus lost-and-found.
  * **Context-Aware:** Utilize geolocation so users can pinpoint exactly where an item was lost or found.
  * **Algorithmic Assistance:** Move away from manual searching by building intelligent matching algorithms that suggest potential item correlations.
  * **Privacy-First:** Build an off-public messaging and claim verification system to protect student data.

---

## Slide 4: The Solution (Key Features - Part 1)
* **Heading:** Introducing FindInCampus
* **Bullet Points:**
  * 📍 **Interactive Map & Heatmaps:** 
    * Users can drop exact location pins for items. 
    * Heatmaps allow campus security or students to identify high-risk "loss hotspots."
  * 🧠 **Intelligent Item Matching:** 
    * Built-in semantic heuristics compare items.
    * It automatically recommends correlations between newly reported constraints and existing database entries.
* **Visual Ideas:** Screenshots of the interactive map and the heatmap feature.

---

## Slide 5: The Solution (Key Features - Part 2)
* **Heading:** Secure Workflows & Resolution
* **Bullet Points:**
  * 🔒 **Secure Resolution Workflow:**
    * A robust "Claim" system requiring owners to submit detailed proof of ownership.
    * Status tracks from "Reported" to "Resolved."
  * 💬 **Integrated Secure Chat:**
    * Peer-to-peer messaging system.
    * Offloads public listing exposure; finders and owners communicate privately.
* **Visual Ideas:** A flow diagram showing: *Find Item -> Submit Claim -> Upload Proof -> Secure Chat -> Resolved*. Screenshots of the chat or claim dashboard.

---

## Slide 6: Technology Stack
* **Heading:** What Powers FindInCampus?
* **Bullet Points:**
  * **Frontend (UI & Logic):**
    * *Core:* HTML5, CSS3 (Vanilla CSS, Glassmorphism, Modern Animations)
    * *Interactivity:* Vanilla ES6+ JavaScript
    * *Architecture:* Offline-ready, Mock API simulating a backend via browser `localStorage` for rapid demonstration.
  * **Backend (Scale-Ready Architecture):**
    * *Environment:* Node.js / Express.js
    * *Language:* TypeScript
    * *Database:* SQLite / libSQL with Prisma ORM
* **Visual Ideas:** Grid of tech stack logos (HTML5, JS, Node.js, Prisma, SQLite).

---

## Slide 7: Future Prospects (Roadmap)
* **Heading:** Where We Go Next
* **Bullet Points:**
  * **AI Image Recognition:** Auto-tag item categories, colors, and brands from uploaded photos.
  * **University SSO:** Restrict portal access specifically to students via CAS/OAuth.
  * **Real-time Notifications:** WebSockets for instant match alerts and chat updates.
  * **Native Mobile Apps:** Transitioning into iOS/Android for native push notifications.
  * **Bounty System:** Optional rewards to incentivize the community to return high-value items.

---

## Slide 8: Q&A / Thank You
* **Heading:** Thank You!
* **Bullet Points:** 
  * Any questions?
  * Contact Info / Link to Demo
* **Visual Ideas:** A large "Q&A" graphic with the FindInCampus logo. 
