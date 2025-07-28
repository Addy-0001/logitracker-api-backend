const jwt = require("jsonwebtoken");

/**
 * Authentication middleware for driver routes
 * Validates the JWT token from the authorization header
 *
 * @async
 * @function authMiddleware
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.authorization - Authorization header containing the JWT token (format: "Bearer [token]")
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next middleware if authentication succeeds
 * @throws {Error} If JWT_SECRET environment variable is not defined
 * @throws {JsonWebTokenError} If token is invalid
 * @throws {TokenExpiredError} If token has expired
 */
const authMiddleware = (req, res, next) => {
    try {
        if (!req || !req.headers) {
            console.error("Request object is undefined");
            return res.status(500).json({ message: "Internal Server Error" });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const Token = authHeader.split(" ")[1].trim();
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET not defined");
        }

        const decoded = jwt.verify(Token, secret);
        req.user = decoded; 
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        } else if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid Token" });
        } else {
            console.error("Authentication error:", error);
            return res.status(500).json({ message: "Server error during authentication" });
        }
    }
};

module.exports = authMiddleware;
