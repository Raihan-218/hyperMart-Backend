import { User } from '../db/users.models.js';
import jwt from 'jsonwebtoken';

export const verifyJWT = async (req, res, next) => {
    try {
        // Get token from cookies or Authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "Unauthorized access: No token provided" });
        }

        // Verify token and decode it
        const decodedToken = jwt.verify(token, process.env.AccessTokenSecret);

        // Find the user by decoded _id
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            return res.status(401).json({ message: "Unauthorized access: User not found" });
        }

        // Attach the user object to the request for later use in the route handler
        req.user = user;

        // Proceed to the next middleware
        next();

    } catch (error) {
        // Handle token expiration
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Unauthorized access: Token expired" });
        }

        // Handle other errors (e.g., invalid token, verification failure)
        return res.status(401).json({ message: error.message || "Unauthorized access: Token verification failed" });
    }
};
