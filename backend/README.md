# 🔥 Blaze Kitchen — Backend API

## Project Structure

```
backend/
├── controllers/          # Business logic (auth, menu, users)
├── middleware/          # Auth, validation, error handling
├── models/              # MongoDB schemas (User, Menu)
├── routes/              # API endpoints
├── seed/                # Database seeding script
├── server.js            # Express server entry point
├── package.json         # Dependencies
├── .env                 # Environment variables (create from .env.example)
└── .gitignore           # Ignore node_modules, .env
```

## Installation & Setup

### 1. Install Dependencies ✅
```bash
npm install
```

### 2. Configure Environment Variables 🔑
Edit `.env` file with:

```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas (replace with your actual connection string)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/blaze-kitchen

# JWT Secret (use a strong random string, min 32 chars)
JWT_SECRET=your_super_secret_key_here_123456789

# Frontend URL
CLIENT_URL=http://127.0.0.1:5500

# Auto-restart controls
# Restart backend when admin updates settings (recommended in dev)
AUTO_RESTART_ON_ADMIN_CHANGE=true
ADMIN_CHANGE_RESTART_DELAY_MS=700

# Restart backend if Mongo stays disconnected for too long
AUTO_RESTART_ON_DB_DISCONNECT=true
DB_DISCONNECT_RESTART_DELAY_MS=15000
```

### 3. Get MongoDB Connection String
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account or login
3. Create a cluster
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/blaze-kitchen`
5. You can use test credentials: `admin` / `Test@123456789`

### 4. Seed Database
```bash
npm run seed
```

This will create:
- **2 test users**: 
  - Admin: `admin@blazekitchen.com` / `Admin@123`
  - User: `user@blazekitchen.com` / `User@123`
- **25 menu items** across 6 categories

### 5. Run Development Server
```bash
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
🚀 Blaze Kitchen API running on http://localhost:5000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login (returns JWT)
- `GET /api/auth/me` — Get current user (protected)

### Menu
- `GET /api/menu` — Get all menu items (paginated, public)
- `GET /api/menu/:id` — Get single item (public)
- `GET /api/menu/admin/all` — Get all items unfiltered (admin only)
- `POST /api/menu` — Create item (admin only)
- `PUT /api/menu/:id` — Update item (admin only)
- `DELETE /api/menu/:id` — Delete item (admin only)

### Users (Admin Only)
- `GET /api/users` — Get all users
- `GET /api/users/:id` — Get user by ID
- `PUT /api/users/:id/role` — Update user role
- `DELETE /api/users/:id` — Delete user

### Health Check
- `GET /api/health` — Server status (public)

## Example Requests

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@blazekitchen.com","password":"User@123"}'
```

### Get Menu
```bash
curl http://localhost:5000/api/menu?category=burgers&page=1
```

### Create Menu Item (Requires Admin Token)
```bash
curl -X POST http://localhost:5000/api/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "name":"New Burger",
    "description":"A test burger",
    "price":299,
    "category":"burgers"
  }'
```

## Available Scripts

```bash
npm start              # Production server
npm run dev            # Development (with nodemon auto-reload)
npm run seed           # Populate database with test data
```

## Tech Stack

- **Runtime**: Node.js >=18.0.0
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB + Mongoose ODM
- **Auth**: JWT (jsonwebtoken)
- **Security**: 
  - bcryptjs (password hashing)
  - helmet (HTTP headers)
  - express-mongo-sanitize (NoSQL injection prevention)
  - express-rate-limit (DDoS protection)
- **Validation**: express-validator
- **Logging**: morgan

## Troubleshooting

### ❌ "MongoDB connection failed"
- Check `MONGO_URI` in `.env` is valid
- Ensure IP address is whitelisted in MongoDB Atlas
- Test connection string on mongo shell first

### ❌ "Cannot find module 'express'"
- Run `npm install` again
- Check `node_modules/` exists

### ❌ "Port 5000 already in use"
- Change `PORT` in `.env` to 5001, 5002, etc.
- Or kill existing process: `lsof -ti:5000 | xargs kill -9`

## Frontend Integration

Frontend files are in `../frontend/`:
- **Admin Dashboard**: `../../frontend/admin/`
- **User App**: `../../frontend/user/`

Frontend API base: `http://localhost:5000/api`

---

**Ready to launch!** 🚀 Configure `.env` → Run `npm run seed` → Run `npm run dev`
