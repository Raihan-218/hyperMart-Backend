import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from "./db/index.js"
const app = express();
const port = process.env.PORT || 3000
dotenv.config();
app.use(express.json());


app.get('/',(req , res )=>{
    res.status(200).json({
        message:"hello, this is hypermart"
    })
})


const startSever = async () => {
    try {
        await connectDB();
        app.listen( port , ()=>{
            console.log(`server is running on PORT : http://localhost:${port}`);
            
        })
    } catch (error) {
        console.log("ERROR :",error);
        
    }
}

startSever();