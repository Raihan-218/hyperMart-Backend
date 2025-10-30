import express from 'express';
import cors from 'cors'; // 1. Import cors
import cookieParser from 'cookie-parser';

const app = express();

// 2. Use cors middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Allow your React app
    credentials: true
}));

// Standard middleware for handling data
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// --- ROUTES ---
import userRouter from './routes/user.routes.js';

// Route declaration
// This makes your registration endpoint available at: http://localhost:3000/api/v1/users/register
app.use("/api/v1/users", userRouter);

export { app };