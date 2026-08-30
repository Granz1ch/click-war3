// Click Wars Express App (without listen — for serverless / Vercel)
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const pool = new Pool({
    connectionString: process.env.DB_URL || 'postgresql://postgres:[uQi-mFR-N7D-t9Q@db.rmrqassbafowbzyfqkks.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'clickwars_secret';

// Auth middleware
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

function adminOnly(req, res, next) {
    auth(req, res, () => {
        if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
        next();
    });
}

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// ============== AUTH ==============
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, coins, stars) VALUES ($1, $2, $3, 100, 0) RETURNING id, username, email, is_admin, coins, stars',
            [username, email, hash]
        );
        await pool.query('INSERT INTO user_skills (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [result.rows[0].id]);
        res.json({ user: result.rows[0], message: 'Registered!' });
    } catch (e) {
        res.status(400).json({ error: 'User exists or error', details: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Wrong password' });
        const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin, admin_color: user.admin_color, admin_font: user.admin_font }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin, admin_color: user.admin_color, admin_font: user.admin_font, coins: user.coins, stars: user.stars } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============== ROOMS ==============
app.get('/api/rooms', async (req, res) => {
    try {
        const result = await pool.query('SELECT r.*, u.username as owner_name FROM rooms r JOIN users u ON r.owner_id = u.id WHERE r.is_active = true ORDER BY r.created_at DESC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/rooms', auth, async (req, res) => {
    const { name, tag } = req.body;
    try {
        const existing = await pool.query('SELECT * FROM rooms WHERE owner_id = $1 AND is_active = true', [req.user.id]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'You already have an active room' });
        const result = await pool.query('INSERT INTO rooms (owner_id, name, tag) VALUES ($1, $2, $3) RETURNING *', [req.user.id, name, tag]);
        await pool.query('INSERT INTO room_skills (room_id) VALUES ($1) ON CONFLICT DO NOTHING', [result.rows[0].id]);
        res.json({ room: result.rows[0], message: 'Room created!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/rooms/:tag', async (req, res) => {
    try {
        const result = await pool.query('SELECT r.*, u.username as owner_name FROM rooms r JOIN users u ON r.owner_id = u.id WHERE r.tag = $1', [req.params.tag]);
        if (!result.rows.length) return res.status(404).json({ error: 'Room not found' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/rooms/:roomId/join-request', auth, async (req, res) => {
    try {
        await pool.query('INSERT INTO room_members (room_id, user_id, approved) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [req.params.roomId, req.user.id, false]);
        res.json({ message: 'Join request sent!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/rooms/:roomId/approve/:userId', auth, async (req, res) => {
    try {
        const room = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.roomId]);
        if (!room.rows.length) return res.status(404).json({ error: 'Room not found' });
        if (room.rows[0].owner_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not owner' });
        await pool.query('UPDATE room_members SET approved = true WHERE room_id = $1 AND user_id = $2', [req.params.roomId, req.params.userId]);
        res.json({ message: 'User approved!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ============== CLICKS ==============
app.post('/api/rooms/:roomId/click', auth, async (req, res) => {
    try {
        const roomRes = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.roomId]);
        if (!roomRes.rows.length) return res.status(404).json({ error: 'Room not found' });
        if (roomRes.rows[0].blocked) return res.status(403).json({ error: 'Room blocked!' });
        const skills = await pool.query('SELECT * FROM user_skills WHERE user_id = $1', [req.user.id]);
        const skill = skills.rows[0] || { click_power: 1, click_speed: 1 };
        const clicks = skill.click_power || 1;
        await pool.query('UPDATE rooms SET total_clicks = total_clicks + $1 WHERE id = $2', [clicks, req.params.roomId]);
        await pool.query('INSERT INTO user_clicks (user_id, room_id, click_amount) VALUES ($1, $2, $3)', [req.user.id, req.params.roomId, clicks]);
        res.json({ message: 'Clicked!', clicks, total: roomRes.rows[0].total_clicks + clicks });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/rooms/:roomId/clicks', async (req, res) => {
    try {
        const result = await pool.query('SELECT total_clicks FROM rooms WHERE id = $1', [req.params.roomId]);
        res.json({ total: result.rows[0]?.total_clicks || 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============== SKILLS ==============
app.get('/api/users/skills', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_skills WHERE user_id = $1', [req.user.id]);
        res.json(result.rows[0] || { click_power: 1, click_speed: 1, egg_chance: 5, pet_boost: 1, skill_points: 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users/skills/upgrade', auth, async (req, res) => {
    const { skill, cost } = req.body;
    try {
        await pool.query('UPDATE user_skills SET ' + skill + ' = ' + skill + ' + 1, skill_points = skill_points - $1 WHERE user_id = $2 AND skill_points >= $1', [cost || 1, req.user.id]);
        const result = await pool.query('SELECT * FROM user_skills WHERE user_id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ============== PETS / EGGS ==============
app.post('/api/eggs/buy', auth, async (req, res) => {
    try {
        await pool.query('UPDATE users SET coins = coins - 50 WHERE id = $1 AND coins >= 50', [req.user.id]);
        const result = await pool.query('INSERT INTO eggs (user_id) VALUES ($1) RETURNING *', [req.user.id]);
        res.json({ egg: result.rows[0], message: 'Egg bought!' });
    } catch (e) {
        res.status(400).json({ error: 'Not enough coins' });
    }
});

app.post('/api/eggs/:id/hatch', auth, async (req, res) => {
    try {
        const rand = Math.random();
        let rarity = 'Basic';
        let isExclusive = false;
        if (rand < 0.001) { rarity = 'Exclusive'; isExclusive = true; }
        else if (rand < 0.02) rarity = 'Legendary';
        else if (rand < 0.08) rarity = 'Rare';
        else if (rand < 0.35) rarity = 'Common';

        const petName = ['Shadow', 'Flame', 'Crystal', 'Thunder', 'Nebula', 'Void', 'Star', 'Moon'][Math.floor(Math.random() * 8)];
        const petRes = await pool.query('INSERT INTO pets (owner_id, name, rarity, is_exclusive, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.user.id, petName, rarity, isExclusive, `/assets/pet-${rarity.toLowerCase()}.png`]);
        await pool.query('UPDATE eggs SET hatched = true, hatched_pet_id = $1 WHERE id = $2 AND user_id = $3', [petRes.rows[0].id, req.params.id, req.user.id]);
        if (isExclusive) {
            await pool.query('UPDATE rooms SET exclusive_pets_count = exclusive_pets_count + 1, stars = stars + 1 WHERE owner_id = $1 OR id IN (SELECT room_id FROM room_members WHERE user_id = $2 AND approved = true)', [req.user.id, req.user.id]);
        }
        res.json({ pet: petRes.rows[0], message: 'Pet hatched! Rarity: ' + rarity });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/eggs', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM eggs WHERE user_id = $1', [req.user.id]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/users/pets', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pets WHERE owner_id = $1', [req.user.id]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============== CHAT ==============
app.get('/api/rooms/:roomId/chat', async (req, res) => {
    try {
        const result = await pool.query('SELECT c.*, u.username FROM chat_messages c JOIN users u ON c.user_id = u.id WHERE c.room_id = $1 ORDER BY c.sent_at DESC LIMIT 50', [req.params.roomId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/rooms/:roomId/chat', auth, async (req, res) => {
    const { message } = req.body;
    try {
        const userRes = await pool.query('SELECT is_admin, admin_color, admin_font FROM users WHERE id = $1', [req.user.id]);
        const isAdmin = userRes.rows[0]?.is_admin || false;
        const color = userRes.rows[0]?.admin_color || '#FFD700';
        const font = userRes.rows[0]?.admin_font || "'Inter', sans-serif";
        await pool.query('INSERT INTO chat_messages (room_id, user_id, message, is_admin_message, admin_color, admin_font) VALUES ($1, $2, $3, $4, $5, $6)', [req.params.roomId, req.user.id, message, isAdmin, color, font]);
        res.json({ message: 'Sent!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============== TREASURY ==============
app.get('/api/rooms/:roomId/treasury', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.roomId]);
        res.json({ coins: result.rows[0]?.treasury_coins || 0, pets: result.rows[0]?.treasury_pets || 0, stars: result.rows[0]?.stars || 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/rooms/:roomId/treasury/deposit', auth, async (req, res) => {
    const { coins, pets, stars } = req.body;
    try {
        await pool.query('UPDATE rooms SET treasury_coins = treasury_coins + $1, treasury_pets = treasury_pets + $2, stars = stars + $3 WHERE id = $4', [coins || 0, pets || 0, stars || 0, req.params.roomId]);
        await pool.query('INSERT INTO treasury_logs (room_id, user_id, action, coins_amount, pets_amount, stars_amount, details) VALUES ($1, $2, $3, $4, $5, $6, $7)', [req.params.roomId, req.user.id, 'deposit', coins || 0, pets || 0, stars || 0, 'User deposit']);
        res.json({ message: 'Deposited!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ============== PROMO CODES ==============
app.get('/api/rooms/:roomId/promos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM promo_codes WHERE room_id = $1 ORDER BY created_at DESC', [req.params.roomId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/rooms/:roomId/promos', auth, async (req, res) => {
    const { code, reward_type, reward_amount } = req.body;
    try {
        const room = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.roomId]);
        if (!room.rows.length) return res.status(404).json({ error: 'Not found' });
        if (room.rows[0].owner_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not authorized' });
        await pool.query('INSERT INTO promo_codes (room_id, code, reward_type, reward_amount, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING', [req.params.roomId, code, reward_type, reward_amount || 1, req.user.id]);
        res.json({ message: 'Promo created!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/promos/use', auth, async (req, res) => {
    const { code } = req.body;
    try {
        const promo = await pool.query('SELECT * FROM promo_codes WHERE code = $1 AND used = false', [code]);
        if (!promo.rows.length) return res.status(404).json({ error: 'Invalid or used promo' });
        const p = promo.rows[0];
        await pool.query('UPDATE promo_codes SET used = true, used_by = $1 WHERE id = $2', [req.user.id, p.id]);
        if (p.reward_type === 'coins') await pool.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [p.reward_amount, req.user.id]);
        else if (p.reward_type === 'pets') await pool.query('UPDATE users SET coins = coins + 100 WHERE id = $1', [req.user.id]);
        res.json({ message: 'Promo redeemed!', reward: p.reward_type, amount: p.reward_amount });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ============== ADMIN ==============
app.get('/api/admin/rooms', adminOnly, async (req, res) => {
    try {
        const result = await pool.query('SELECT r.*, u.username as owner_name FROM rooms r JOIN users u ON r.owner_id = u.id ORDER BY r.created_at DESC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/block-room', adminOnly, async (req, res) => {
    const { room_id, forever, until } = req.body;
    try {
        await pool.query('UPDATE rooms SET blocked = true, blocked_forever = $1, blocked_until = $2 WHERE id = $3', [forever || false, until || null, room_id]);
        await pool.query('INSERT INTO admin_actions (admin_id, target_type, target_id, action, details) VALUES ($1, $2, $3, $4, $5)', [req.user.id, 'room', room_id, 'block', JSON.stringify({ forever, until })]);
        res.json({ message: 'Room blocked!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/admin/unblock-room', adminOnly, async (req, res) => {
    try {
        await pool.query('UPDATE rooms SET blocked = false, blocked_forever = false, blocked_until = null WHERE id = $1', [req.body.room_id]);
        res.json({ message: 'Room unblocked!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/admin/give', adminOnly, async (req, res) => {
    const { user_id, coins, pets, stars } = req.body;
    try {
        if (coins) await pool.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [coins, user_id]);
        if (pets) await pool.query('UPDATE users SET coins = coins + 50 WHERE id = $1', [user_id]);
        if (stars) await pool.query('UPDATE users SET stars = stars + $1 WHERE id = $2', [stars, user_id]);
        await pool.query('INSERT INTO admin_actions (admin_id, target_type, target_id, action, details) VALUES ($1, $2, $3, $4, $5)', [req.user.id, 'user', user_id, 'give', JSON.stringify({ coins, pets, stars })]);
        res.json({ message: 'Given!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/admin/seize-treasury', adminOnly, async (req, res) => {
    const { room_id, coins, pets } = req.body;
    try {
        await pool.query('UPDATE rooms SET treasury_coins = treasury_coins - $1, treasury_pets = treasury_pets - $2 WHERE id = $3', [coins || 0, pets || 0, room_id]);
        await pool.query('INSERT INTO treasury_logs (room_id, user_id, action, coins_amount, pets_amount, details) VALUES ($1, $2, $3, $4, $5, $6)', [room_id, req.user.id, 'seize', -(coins || 0), -(pets || 0), 'Admin seized']);
        await pool.query('INSERT INTO admin_actions (admin_id, target_type, target_id, action, details) VALUES ($1, $2, $3, $4, $5)', [req.user.id, 'room', room_id, 'seize_treasury', JSON.stringify({ coins, pets })]);
        res.json({ message: 'Seized!' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ============== ROOM SKILLS / DESIGN ==============
app.get('/api/rooms/:roomId/skills', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM room_skills WHERE room_id = $1', [req.params.roomId]);
        res.json(result.rows[0] || { design_level: 1, tag_custom: 0, font_custom: 0, color_scheme: 0, animation_level: 0, skill_points: 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/rooms/skills/upgrade', auth, async (req, res) => {
    const { room_id, skill, cost } = req.body;
    try {
        const room = await pool.query('SELECT owner_id FROM rooms WHERE id = $1', [room_id]);
        if (!room.rows.length || (room.rows[0].owner_id !== req.user.id && !req.user.is_admin)) return res.status(403).json({ error: 'Not authorized' });
        await pool.query('UPDATE room_skills SET ' + skill + ' = ' + skill + ' + 1, skill_points = skill_points - $1 WHERE room_id = $2 AND skill_points >= $1', [cost || 1, room_id]);
        const result = await pool.query('SELECT * FROM room_skills WHERE room_id = $1', [room_id]);
        res.json(result.rows[0]);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ============== CURRENT USER ==============
app.get('/api/me', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, is_admin, admin_color, admin_font, coins, stars FROM users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Initialize database on start (only when not in serverless mode without DB?)
// For serverless, we'll rely on separate DB initialization

module.exports = app;
