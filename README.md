**Zalya — AI Powered E-commerce Website** 🎨🛍️

Zalya is an intelligent, full-stack AI-powered e-commerce web application that lets users define their own style with smart outfit suggestions, virtual try-ons, and a social shopping community.

Tagline: Make and define your own style! ✨

---

**Project Overview** 🚀

Zalya integrates e-commerce functionality, social engagement, and AI-driven personalization — offering users a smarter, more immersive shopping experience.
Built with MERN + TypeScript, it uses modular architecture for scalability, maintainability, and smooth development.

---

**Features** 💡

**AI & Smart Features** 🤖

* AI Visual Try-On: Upload your photo to instantly preview outfits 👕
* Smart Outfit Suggestions: Recommendations based on color, gender, and style 🧥
* Text-based Outfit Search: Type messages like "I need an outfit for a wedding" for full outfit suggestions with cost breakdowns 💬
* AI-powered Product Recognition: Upload any clothing image; AI detects item, color, and gender to suggest matching products 📸

**User Features** 👤

* Login / Signup with JWT Authentication 🔒
* Profile Page with user info, profile picture, and personalized style suggestions 📝
* Wishlist & Cart Management with real-time updates 🛒
* Community Feed: Share posts, follow others, like, and comment (Instagram-style) ❤️
* Order Confirmation with downloadable PDF receipts 🧾
* Real-time Notifications for new products, discounts, and price drops 🔔

**Admin Features** 🧑‍💼

* Dashboard Analytics tracking users, orders, and product activity 📊
* Recent Activity Log for wishlist, cart, orders, and logins 🗂️
* Add / Update / Delete Products with instant database sync 🛠️
* Admin Authentication with role-based access 🔑

---

**Tech Stack** 🛠️

Frontend: React + Vite + TypeScript, Tailwind CSS, Framer Motion, Axios

Backend: Node.js + Express, MongoDB + Mongoose, JWT Authentication, Real-time updates (WebSockets / Firebase optional)

AI Integrations: Groq AI / Gemini Studio for text understanding, StableVITON / TryOnDiffusion for virtual try-on

---

**Folder Structure** 📁

```
Zalya-AI_powered_e-commerce_website/
│
├── client/                     # React Frontend
│   ├── src/components/         # UI Components
│   ├── src/pages/              # Pages: Home, Products, Community, Profile, Admin, etc.
│   ├── src/context/            # State Management
│   ├── src/utils/              # Helpers & API calls
│
├── server/                     # Node.js Backend
│   ├── controllers/            # Route Handlers
│   ├── models/                 # MongoDB Schemas
│   ├── routes/                 # API Routes
│   ├── middleware/             # Auth & Error Handling
│   ├── config/                 # DB Connection & Environment
│
└── README.md
```

---

**How to Run Locally** 💻

1. Clone the Repository

```
git clone https://github.com/yagneshreddykoramoni/Zalya-AI_powered_e-commerce_website.git
cd Zalya-AI_powered_e-commerce_website
```

2. Install Dependencies

```
cd client
npm install
cd ../server
npm install
```

3. Set Up Environment Variables

Create a `.env` file inside `server/` and add:

```
MONGO_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
```

> 🔒 Do not share your actual MongoDB URI or JWT secret publicly.

4. Run the Project

Run backend:

```
cd server
npm run dev
```

Run frontend:

```
cd client
npm run dev
```

---

**Key Features in Action** 🎯

* AI Visual Try-On — Upload your photo, try outfits instantly 👕
* Smart Outfit Recommendations — Contextual suggestions in real-time 🧥
* Community Feed — Social interaction for shoppers ❤️
* Instant Cart & Wishlist Updates 🛒
* PDF Order Confirmation Downloads 🧾

---

**Future Enhancements** 🔮

* AI Voice-based Product Search 🗣️
* AR-based Virtual Try-On for mobile 📱
* Personalized Shopping Feeds and Trends 📰
* AI Analytics for Admins (Sales Insights, Product Trends) 📊

---

**Project Status** ✅

* Authentication System (User & Admin) — Completed
* Product, Order, and User Models — Completed
* Cart, Wishlist, and PDF Orders — Completed
* Admin Dashboard — In Progress
* AI Modules — Under Development
* Deployment — Upcoming 🚀

---

**Developer** 👨‍💻

K. Yagnesh Reddy  
B.Tech (CSE - Data Science)  
Institute of Aeronautical Engineering, Hyderabad  
Email: yagneshreddykoramoni@gmail.com  
Portfolio: https://yagneshreddy.vercel.app/  
LinkedIn: https://www.linkedin.com/in/yagnesh-reddy-koramoni-a8b0a2259/  
GitHub: https://github.com/yagneshreddykoramoni

