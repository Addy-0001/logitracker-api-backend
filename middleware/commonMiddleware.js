const jwt = require("jsonwebtoken");

/**
 * Authentication middleware for driver and admin routes
 * Validates the JWT token from the authorization header and checks user role
 *
 * @function authMiddleware
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

        if (!decoded.role || (decoded.role !== "driver" && decoded.role !== "admin")) {
            return res.status(403).json({ message: "Access denied: insufficient permissions" });
        }

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
