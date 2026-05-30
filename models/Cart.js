const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);