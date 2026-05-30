const Product = require('../models/Product');
const Cart = require('../models/Cart');
const dbSQL = require('../config/mysqlDb');

// GET: Fetch all products out from MongoDB
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST: Add items to a user's dynamic basket document inside MongoDB
exports.addToCart = async (req, res) => {
    const { userId, productId } = req.body;
    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [{ productId, quantity: 1 }] });
        } else {
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += 1;
            } else {
                cart.items.push({ productId, quantity: 1 });
            }
        }
        await cart.save();
        res.json({ success: true, message: "Item added to MongoDB basket cache." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET: Fetch active cart entries from MongoDB and pull in product information
exports.getCart = async (req, res) => {
    const { userId } = req.query;
    try {
        const cart = await Cart.findOne({ userId: parseInt(userId) }).populate('items.productId');
        res.json(cart || { items: [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST: Insert delivery coordinates cleanly into the MySQL 'addresses' table
exports.saveAddress = async (req, res) => {
    const { userId, street, city, zip } = req.body;
    try {
        const query = 'INSERT INTO addresses (user_id, street_address, city, postal_code) VALUES (?, ?, ?, ?)';
        await dbSQL.execute(query, [userId, street, city, zip]);
        res.json({ success: true, message: "Relational delivery coordinates saved to MySQL!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};