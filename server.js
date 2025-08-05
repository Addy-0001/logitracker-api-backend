const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const routes = require("./routes/index");
const path = require("path");

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const app = express();

app.use(express.json());
app.use(cors());

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
app.use('/api/v1', routes);

module.exports = app;  // Export app instance for tests
