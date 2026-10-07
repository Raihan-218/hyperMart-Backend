import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const localDevelopmentOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5173', 'http://localhost:5174'];
const allowedOrigins = new Set([...configuredOrigins, ...localDevelopmentOrigins]);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser()); 

import userRouter from './routes/user.routes.js';
import adminRouter from './routes/admin.routes.js';
import productRouter from './routes/products.route.js'
import cartRouter from './routes/carts.routes.js';
import reviewRouter from './routes/review.routes.js'
app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});


app.use("/api/v1/users", userRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/products",productRouter);
app.use("/api/v1/carts" , cartRouter)
app.use("/api/v1/reviews" , reviewRouter)


export { app };