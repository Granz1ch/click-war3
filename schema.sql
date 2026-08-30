# ⚔ Click Wars — Legendary Click Arena

A premium click-game with room battles, skill trees, pet hatching (with rare **Exclusive** pets), treasury, promo codes, admin commands, and beautiful glassmorphism design.

---

## 🏗 Architecture

- **Backend**: Node.js + Express (REST API)
- **Database**: Supabase PostgreSQL (`postgresql://postgres:[uQi-mFR-N7D-t9Q@db.rmrqassbafowbzyfqkks.supabase.co:5432/postgres`)
- **Frontend**: Pure HTML + CSS (modern glassmorphism, gold gradients, animations) + Vanilla JS
- **Images**: AI-generated pet art (Exclusive, Legendary, Rare, Common, Basic) + cosmic backgrounds

---

## 🚀 Quick Start

```bash
npm install
npm start
```

Server runs at `http://localhost:3001`.

---

## 🔑 Admin Account (Pre-Created)

| Field | Value |
|---|---|
| Username | `Granz1` |
| Password | `157816Nefo` |
| Admin Color | `#FFD700` (Gold) |
| Admin Font | `Playfair Display` |

---

## 📊 Database Schema (Supabase)

### Tables Created:
- `users` — warriors, coins, stars, admin flags
- `rooms` — realms with tag, clicks, stars, treasury, block status
- `room_members` — join requests / approved members
- `user_skills` — click power, speed, combo, egg chance, pet boost
- `room_skills` — design level, custom fonts, tag style, color scheme, animations
- `pets` — 5 rarities: Basic, Common, Rare, Legendary, **Exclusive** (0.1% chance)
- `eggs` — bought eggs that can be hatched
- `user_clicks` — aggregated click records
- `chat_messages` — room chat with admin styling (color + font)
- `treasury_logs` — audit of treasury actions
- `promo_codes` — per-room promo codes
- `admin_actions` — audit log for admin operations

---

## 🎮 Game Features

### Registration & Login
- Users register with username, email, password
- JWT authentication for all protected endpoints

### Room System
- Each user creates **one** active room (name + tag)
- Users request entry to other rooms — owner approves
- Owners upgrade room design via **room skill tree**

### Clicking & Skills
- Users click to grow the room's total click count
- **User skill tree**: Click Power, Click Speed, Combo, Egg Chance, Pet Boost
- Skills cost points; clicking grants growth

### Pets & Eggs
- Buy eggs for 50 coins
- Hatch with random rarity
- **Exclusive** pets grant +1 Star to the room (rating boost)
- More Exclusive pets = more stars = higher ranking

### Treasury
- Users deposit coins (and optionally pets) into the room treasury
- Required for stars conversion and top rankings
- Admin can seize treasury

### Chat
- Real-time style chat per room
- Admin messages have gold color and custom `Playfair Display` font

### Promo Codes
- Room owners (and admins) create promo codes per room
- Users redeem codes for coins, pets, or stars

### Admin Panel
- Admins have access to **all rooms**
- Custom admin color (`#FFD700`) and font (`Playfair Display`)
- Actions:
  1. **Block Room**: temporary or permanent (stops game process)
  2. **Give Rewards**: coins, pets, stars to any user
  3. **Seize Treasury**: take coins/pets from a room

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create warrior |
| POST | `/api/auth/login` | No | Get JWT |
| GET | `/api/rooms` | No | List all rooms |
| POST | `/api/rooms` | User | Create room |
| GET | `/api/rooms/:tag` | No | Room by tag |
| POST | `/api/rooms/:roomId/join-request` | User | Request entry |
| POST | `/api/rooms/:roomId/approve/:userId` | Owner/Admin | Approve user |
| POST | `/api/rooms/:roomId/click` | User | Click for points |
| POST | `/api/users/skills/upgrade` | User | Upgrade click skill |
| POST | `/api/eggs/buy` | User | Buy egg (50 coins) |
| POST | `/api/eggs/:id/hatch` | User | Hatch egg |
| GET | `/api/users/pets` | User | My pets |
| GET | `/api/rooms/:roomId/chat` | No | Room chat history |
| POST | `/api/rooms/:roomId/chat` | User | Send message |
| GET | `/api/rooms/:roomId/treasury` | No | Treasury status |
| POST | `/api/rooms/:roomId/treasury/deposit` | User | Deposit coins |
| GET | `/api/rooms/:roomId/promos` | No | Room promos |
| POST | `/api/rooms/:roomId/promos` | Owner/Admin | Create promo |
| POST | `/api/promos/use` | User | Redeem promo |
| GET | `/api/admin/rooms` | Admin | All rooms (admin) |
| POST | `/api/admin/block-room` | Admin | Block room |
| POST | `/api/admin/unblock-room` | Admin | Unblock room |
| POST | `/api/admin/give` | Admin | Give rewards |
| POST | `/api/admin/seize-treasury` | Admin | Seize treasury |

---

## 🎨 Design Highlights

- **Glassmorphism** cards with gold borders and blurred backgrounds
- **Gold gradient** text and accents (`#FFD700` → `#FFA500` → `#FF8C00`)
- **Playfair Display** and **Cormorant Garamond** editorial fonts
- **Cosmic dark navy** theme (`#0a0e17`) with star-like radial gradients
- **AI-generated pet images** for each rarity tier
- Responsive grid layout with hover animations

---

## 📁 Project Structure

```
click-wars/
├── .env
├── package.json
├── schema.sql           (Supabase schema + admin insert)
├── setup-db.sh
├── README.md
├── server/
│   └── index.js         (Express API)
└── public/
    ├── index.html       (Landing / Login / Register)
    ├── index.js         (Frontend for landing)
    ├── app.html         (Main Arena Dashboard)
    ├── app.js           (Game logic + API calls)
    ├── styles.css       (Beautiful glassmorphism CSS)
    └── assets/
        ├── hero-cosmos.jpg
        ├── room-background.jpg
        ├── pet-exclusive.png
        ├── pet-legendary.png
        ├── pet-rare.png
        ├── pet-common.png
        ├── pet-basic.png
        ├── egg-golden.png
        └── admin-badge.png
```

---

## ⚠️ Important Notes

1. **Database**: The server expects the Supabase PostgreSQL connection string from `.env`. You must run `schema.sql` in your Supabase SQL Editor to create all tables and the admin user.
2. **Admin User**: `Granz1` / `157816Nefo` is pre-inserted in the schema. The server also tries to create it automatically if missing (but requires DB connection).
3. **Images**: All pet images are AI-generated and stored in `public/assets/`. They load automatically when pets are hatched.
4. **No Errors Policy**: All routes include error handling; frontend catches and displays errors gracefully.
5. **English Interface**: All text is in English with elegant typography.

---

## 🏁 Status

- ✅ Backend server (Express) — complete
- ✅ Database schema (Supabase PostgreSQL) — complete
- ✅ Admin account (`Granz1`) — pre-configured
- ✅ Beautiful modern design — complete
- ✅ Click mechanics + skill trees — complete
- ✅ Pets (5 rarities) + egg system — complete
- ✅ Room treasury + promo codes — complete
- ✅ Chat with admin styling — complete
- ✅ Admin commands (block, give, seize) — complete
- ✅ AI-generated images — complete

---

Enjoy the Arena!
