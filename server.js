const express = require('express');
const cors = require('cors');
const connectMongo = require('./config/mongoDb');
const authCtrl = require('./controllers/authController');
const shopCtrl = require('./controllers/shopController');
const payCtrl = require('./controllers/paymentController');
const adminCtrl = require('./controllers/adminController');
const Product = require('./models/Product'); // Imported for the seed endpoint

const app = express();
app.use(cors()); // Enables cross-origin requests from React
app.use(express.json());

// Initialize MongoDB Connection
connectMongo();

// 1. Identity Gateways
app.post('/api/user/register', authCtrl.registerUser);
app.post('/api/user/login', authCtrl.loginUser);
app.post('/api/admin/login', authCtrl.loginAdmin);

// 2. Marketplace & Cart Operations
app.get('/api/products', shopCtrl.getProducts);
app.post('/api/cart', shopCtrl.addToCart);
app.get('/api/cart', shopCtrl.getCart);
app.post('/api/address', shopCtrl.saveAddress);
app.post('/api/checkout', payCtrl.processPayment);

// 3. Administrative Operational Endpoints
app.post('/api/admin/products', adminCtrl.createProduct);
app.delete('/api/admin/products/:id', adminCtrl.deleteProduct);
app.get('/api/admin/metrics', adminCtrl.getMetricsDashboard);
app.post('/api/admin/deliver', adminCtrl.toggleDeliveryStatus);

// 4. Automated Catalog Seeding Script Utility
app.get('/api/seed', async (req, res) => {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            await Product.create([
                { name: "Alpha Core Smartwatch", price: 199.99, specifications: { RAM: "2GB", Storage: "16GB" } },
                { name: "Pro Sound Headphones", price: 299.50, specifications: { RAM: "N/A", Storage: "N/A" } }
            ]);
            return res.send("Seeding complete. Mock items added to MongoDB!");
        }
        res.send("Catalog already populated.");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Run Backend Microservice
app.listen(3000, () => console.log('🚀 Backend secure microservice platform active on port 3000'));