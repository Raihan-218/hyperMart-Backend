import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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