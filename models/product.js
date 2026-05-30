const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    specifications: { type: Map, of: String }, // Highly flexible metadata properties
    stockCount: { type: Number, default: 10 }
});

module.exports = mongoose.model('Product', ProductSchema);