/**
 * Main application entry point for LogiTracker API
 * @module server
 * @requires express
 * @requires cors
 * @requires dotenv
 * @requires ./config/db
 * @requires ./routes/index
 * @requires path
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const routes = require("./routes/index");
const path = require("path");

/**
 * Load environment variables from .env.test file
 */
dotenv.config({ path: '.env.test' });

/**
 * Express application instance
 * @type {import('express').Application}
 */
const app = express();

/**
 * Middleware setup
 * - express.json() for parsing JSON request bodies
 * - cors() for handling Cross-Origin Resource Sharing
 */
app.use(express.json());
app.use(cors());

/**
 * Connect to MongoDB database
 * @function connectDB
 */
connectDB();

/**
 * Serve static PDF files from the 'pdfs' directory
 */
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

/**
 * Mount all API routes under '/api/v1' path prefix
 */
app.use('/api/v1', routes);

/**
 * Server port - uses environment variable or defaults to 5000
 * @type {number}
 */
const PORT = process.env.PORT || 5000;

/**
 * Start the server and listen for incoming connections
 * @param {number} PORT - The port number to listen on
 * @param {string} '0.0.0.0' - Listen on all available network interfaces
 * @param {Function} callback - Called when server starts listening
 */
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

/**
 * Export Express app for testing purposes
 * @exports app
 */
module.exports = app;