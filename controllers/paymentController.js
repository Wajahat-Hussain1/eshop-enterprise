const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const dbSQL = require('../config/mysqlDb');
const Cart = require('../models/Cart');

exports.processPayment = async (req, res) => {
    const { userId, totalAmount } = req.body;
    try {
        // Create an atomic test intent sequence utilizing Stripe SDK
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // Currency input expected in subunit cents
            currency: 'usd',
            payment_method: 'pm_card_visa', // Automatic simulator pass token 
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
        });

        // Upon payment success, commit the row entry inside SQL Order Ledger
        await dbSQL.execute(
            'INSERT INTO orders (user_id, total_amount, stripe_payment_id) VALUES (?, ?, ?)',
            [userId, totalAmount, paymentIntent.id]
        );

        // Clear the corresponding customer basket document inside MongoDB cache
        await Cart.deleteOne({ userId });

        res.json({ success: true, transactionId: paymentIntent.id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};