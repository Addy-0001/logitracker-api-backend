// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { verifyToken } = require('./middleware/auth');

dotenv.config();

const app = express();

// CORS config
const corsOptions = {
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

// Routes
const jobRoutes = require('./routes/jobs');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');

app.use('/api/v1/jobs', verifyToken, jobRoutes);
app.use('/api/v1/users', verifyToken, userRoutes);
app.use('/api/v1/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
    });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

    mongoose
        .connect(process.env.MONGO_URI)
        .then(() => console.log('MongoDB connected'))
        .catch(err => console.error('MongoDB connection error:', err));
}

module.exports = app;