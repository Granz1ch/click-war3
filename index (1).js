{
  "version": 2,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.js" },
    { "src": "/assets/(.*)", "dest": "/public/assets/$1" },
    { "src": "/(.*\\.(js|css|png|jpg|jpeg|gif|svg))", "dest": "/public/$1" },
    { "src": "/(.*)", "dest": "/public/index.html" }
  ],
  "env": {
    "DB_URL": "postgresql://postgres:[uQi-mFR-N7D-t9Q@db.rmrqassbafowbzyfqkks.supabase.co:5432/postgres",
    "JWT_SECRET": "clickwars_secret",
    "NODE_ENV": "production"
  }
}
