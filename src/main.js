import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from "./db/index.js";
import { app } from './app.js'; // <-- 1. IMPORT your real app from app.js

// 2. Configure dotenv *FIRST*
// This ensures process.env.PORT is loaded
dotenv.config({
    path: './.env' 
});

const port = process.env.PORT || 3000;

const startSever = async () => {
    try {
        await connectDB();
        
        app.listen(port, () => {
            console.log(`Server is running on PORT : http://localhost:${port}`);
        });
    } catch (error) {
        console.log("ERROR connecting to DB or starting server:", error);
    }
}

startSever();