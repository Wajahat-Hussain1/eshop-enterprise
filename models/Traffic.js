const mongoose = require('mongoose');

const TrafficSchema = new mongoose.Schema({
    endpoint: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    userRole: { type: String, default: 'anonymous' }
});

module.exports = mongoose.model('Traffic', TrafficSchema);