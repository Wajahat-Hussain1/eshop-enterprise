//const dbSQL = require('../config/mysqlDb');
//const bcrypt = require('bcryptjs');

//exports.registerUser = async (req, res) => {
//    const { name, email, password } = req.body;
//    if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields." });
//    try {
//        const hash = await bcrypt.hash(password, 10);
//        await dbSQL.execute(
//            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
//            [name, email, hash]
//        );
//        res.status(201).json({ success: true, message: "User account registered." });
//    } catch (err) { res.status(500).json({ error: err.message }); }
//};

//exports.loginUser = async (req, res) => {
//    const { email, password } = req.body;
//    try {
//        const [rows] = await dbSQL.execute('SELECT * FROM users WHERE email = ?', [email]);
//        if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials." });
        
//        const match = await bcrypt.compare(password, rows[0].password_hash);
 //       if (!match) return res.status(401).json({ error: "Access validation denied." });

//        res.json({ success: true, role: 'user', userId: rows[0].id, name: rows[0].name });
 //   } catch (err) { res.status(500).json({ error: err.message }); }
//};

//exports.loginAdmin = async (req, res) => {
//    const { username, password } = req.body;
//    try {
//        const [rows] = await dbSQL.execute('SELECT * FROM admins WHERE username = ?', [username]);
 //       if (rows.length === 0) return res.status(401).json({ error: "Administrative record not found." });

//        const match = await bcrypt.compare(password, rows[0].password_hash);
 //       if (!match) return res.status(401).json({ error: "Invalid credentials." });

 //       res.json({ success: true, role: 'admin', username: rows[0].username });
//  } catch (err) { res.status(500).json({ error: err.message }); }
//};


const dbSQL = require('../config/mysqlDb');
// bcrypt is removed from here for simple testing comparison

// --- Standard User Registration & Login ---
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields." });
    try {
        // Storing password directly as plain text for easy demonstration
        await dbSQL.execute(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, password]
        );
        res.status(201).json({ success: true, message: "User account registered." });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await dbSQL.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials." });
        
        // Direct plain text comparison check
        if (password !== rows[0].password_hash) {
            return res.status(401).json({ error: "Access validation denied." });
        }

        res.json({ success: true, role: 'user', userId: rows[0].id, name: rows[0].name });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Secure Admin Login ---
exports.loginAdmin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await dbSQL.execute('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: "Administrative record not found." });

        // Direct plain text comparison check
        if (password !== rows[0].password_hash) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        res.json({ success: true, role: 'admin', username: rows[0].username });
    } catch (err) { res.status(500).json({ error: err.message }); }
};