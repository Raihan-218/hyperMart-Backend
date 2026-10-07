import dotenv from 'dotenv';
import { connectDB } from "./db/index.js";
import { app } from './app.js'; // <-- 1. IMPORT your real app from app.js

// 2. Configure dotenv *FIRST*
// This ensures process.env.PORT is loaded
dotenv.config({
    path: './.env' 
});

await connectDB();

if (!process.env.VERCEL) {
    const port = process.env.PORT || 5643;
    app.listen(port, () => {
        console.log(`Server listening on  http://localhost:${port}`);
    });
}

export default app;