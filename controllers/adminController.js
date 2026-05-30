const Product = require('../models/Product');
const Traffic = require('../models/Traffic');
const dbSQL = require('../config/mysqlDb');

exports.createProduct = async (req, res) => {
    try {
        const { name, price, specifications } = req.body;
        const newProduct = await Product.create({ name, price, specifications });
        res.status(201).json({ success: true, data: newProduct });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product scrubbed." });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getMetricsDashboard = async (req, res) => {
    try {
        const [orders] = await dbSQL.execute('SELECT * FROM orders ORDER BY id DESC');
        const trafficHits = await Traffic.countDocuments();
        res.json({ orders, trafficHits });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.toggleDeliveryStatus = async (req, res) => {
    try {
        await dbSQL.execute('UPDATE orders SET delivery_status = "Delivered" WHERE id = ?', [req.body.orderId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};