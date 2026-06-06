const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dbSQL = require('./config/mysqlDb');

// Load Schema Models 
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const TrafficLog = require('./models/Traffic'); // Kept as Traffic per your configuration update

const app = express();
app.use(cors());
app.use(express.json());

// --- INTERCEPT MIDDLEWARE (Saves Traffic Metric Logs to MongoDB) ---
app.use(async (req, res, next) => {
    try {
        await TrafficLog.create({ endpoint: req.path, method: req.method });
    } catch (err) {
        console.error("Traffic logger failed:", err.message);
    }
    next();
});

// ===================================================
// INLINED AUTHENTICATION ROUTES (No external files required)
// ===================================================

// User Registration Route (Saves directly to MySQL)
app.post('/api/user/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: "Please fill out all fields." });
        }
        // Save user record to MySQL
        await dbSQL.execute(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, password]
        );
        
        // Fetch the newly inserted user ID to automatically log them in
        const [rows] = await dbSQL.execute('SELECT id FROM users WHERE email = ?', [email]);
        res.json({ success: true, role: 'user', userId: rows[0].id, email });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, error: "An account with this email already exists." });
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

// User Login Route (Validates against MySQL credentials)
app.post('/api/user/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await dbSQL.execute('SELECT * FROM users WHERE email = ? AND password_hash = ?', [email, password]);
        if (rows.length > 0) {
            res.json({ success: true, role: 'user', userId: rows[0].id, email: rows[0].email });
        } else {
            res.status(401).json({ success: false, error: "Invalid email or password combination." });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin System Hardcoded Vault Authorization Gate
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    // Hardcoded secure credential checks mirroring environment targets
    if (username === 'root_admin' && password === 'admin123') {
        res.json({ success: true, role: 'admin', userId: 'SYSTEM_ROOT' });
    } else {
        res.status(401).json({ success: false, error: "Access Denied: Invalid Administrative Credentials." });
    }
});


// ===================================================
// CORE CORE COMMERCE ROUTE SYSTEM
// ===================================================

// Database Seeding Script Route
app.get('/api/seed', async (req, res) => {
    try {
        await Product.deleteMany({});
        await Product.create([
            { name: "Pro Sound Headphones", price: 299.50, specifications: { Key: "Type", Value: "Over-Ear Wireless" } },
            { name: "Alpha Core Smartwatch", price: 199.99, specifications: { Key: "Battery", Value: "Up to 7 Days" } }
        ]);
        res.send("Seeding complete");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Fetch catalog from MongoDB
app.get('/api/products', async (req, res) => {
    try {
        const items = await Product.find({});
        res.json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fetch user cart from MongoDB cache
app.get('/api/cart', async (req, res) => {
    const { userId } = req.query;
    try {
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        res.json(cart || { items: [] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add item to MongoDB live cache basket
app.post('/api/cart', async (req, res) => {
    const { userId, productId } = req.body;
    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [{ productId, quantity: 1 }] });
        } else {
            const itemIdx = cart.items.findIndex(item => item.productId && item.productId.toString() === productId);
            if (itemIdx > -1) {
                cart.items[itemIdx].quantity += 1;
            } else {
                cart.items.push({ productId, quantity: 1 });
            }
        }
        await cart.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete item handler from MongoDB cart cache
app.delete('/api/cart', async (req, res) => {
    const { userId, productId } = req.body;
    try {
        let cart = await Cart.findOne({ userId });
        if (cart) {
            cart.items = cart.items.filter(item => {
                if (!item.productId) return false;
                const itemIdStr = item.productId._id ? item.productId._id.toString() : item.productId.toString();
                return itemIdStr !== productId.toString();
            });
            await cart.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save delivery details to MySQL & Return the Address ID
app.post('/api/address', async (req, res) => {
    const { userId, street, city, zip } = req.body;
    try {
        // 1. Insert or update the address matching your exact schema columns
        await dbSQL.execute(
            'INSERT INTO addresses (user_id, street_address, city, postal_code) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE street_address=?, city=?, postal_code=?',
            [userId, street, city, zip, street, city, zip]
        );
        
        // 2. Fetch the ID of the address record to pass back to the frontend state
        const [rows] = await dbSQL.execute(
            'SELECT id FROM addresses WHERE user_id = ? AND street_address = ? AND city = ? AND postal_code = ?',
            [userId, street, city, zip]
        );
        
        const addressId = rows[0].id;
        res.json({ success: true, message: "Delivery address mapped safely to MySQL ledger!", addressId });
    } catch (err) { 
        console.error("SQL Error details:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

// Stripe checkout mock processor (Saves order linked with address_id)
app.post('/api/checkout', async (req, res) => {
    const { userId, totalAmount, addressId } = req.body;
    try {
        if (!addressId) {
            return res.status(400).json({ success: false, error: "Missing active shipping address confirmation token." });
        }

        const txId = 'ch_' + Math.random().toString(36).substring(2, 11).toUpperCase();
        
        // Updated to include address_id column matching your new schema layout
        await dbSQL.execute(
            'INSERT INTO orders (user_id, address_id, total_amount, delivery_status, stripe_payment_id) VALUES (?, ?, ?, ?, ?)',
            [userId, addressId, totalAmount, 'Pending', txId]
        );
        
        // Clear active cached user basket out of MongoDB
        await Cart.deleteOne({ userId });
        res.json({ success: true, transactionId: txId });
    } catch (err) { 
        console.error("Checkout processing failure:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

// Save delivery details to MySQL
// app.post('/api/address', async (req, res) => {
//     const { userId, street, city, zip } = req.body;
//     try {
//         await dbSQL.execute(
//             'INSERT INTO addresses (user_id, street, city, zip_code) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE street=?, city=?, zip_code=?',
//             [userId, street, city, zip, street, city, zip]
//         );
//         res.json({ success: true, message: "Delivery address mapped safely to MySQL ledger!" });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// });

// // Stripe checkout mock processor
// app.post('/api/checkout', async (req, res) => {
//     const { userId, totalAmount } = req.body;
//     try {
//         const txId = 'ch_' + Math.random().toString(36).substring(2, 11).toUpperCase();
//         await dbSQL.execute(
//             'INSERT INTO orders (user_id, total_amount, delivery_status) VALUES (?, ?, ?)',
//             [userId, totalAmount, 'Pending']
//         );
//         await Cart.deleteOne({ userId });
//         res.json({ success: true, transactionId: txId });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// });

// Fetch system management view metrics
app.get('/api/admin/metrics', async (req, res) => {
    try {
        // FIXED: Added FROM clause specifying the 'orders' ledger database table
        const [orders] = await dbSQL.execute('SELECT * FROM orders ORDER BY id DESC');
        const trafficHits = await TrafficLog.countDocuments({});
        res.json({ orders, trafficHits });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Post inventory product to MongoDB collection
app.post('/api/admin/products', async (req, res) => {
    const { name, price, specifications } = req.body;
    try {
        await Product.create({ name, price, specifications });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update order logistical status inside MySQL database
app.post('/api/admin/deliver', async (req, res) => {
    const { orderId } = req.body;
    try {
        await dbSQL.execute('UPDATE orders SET delivery_status = "Delivered" WHERE id = ?', [orderId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fire up connections
mongoose.connect('mongodb://127.0.0.1:27017/eshop_enterprise')
    .then(() => {
        console.log("🌱 Connected to MongoDB successfully.");
        app.listen(3000, () => {
            console.log("🚀 Backend secure microservice platform active on port 3000");
        });
    })
    .catch(err => console.error("Database connection fault:", err));