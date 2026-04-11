import dotenv from 'dotenv';
import { connectDB } from "./db/index.js";
import { app } from './app.js'; // <-- 1. IMPORT your real app from app.js

// 2. Configure dotenv *FIRST*
// This ensures process.env.PORT is loaded
dotenv.config({
    path: './.env' 
});

await connectDB();

export default app;