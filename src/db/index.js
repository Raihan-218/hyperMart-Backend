import mongoose  from "mongoose";
import dotenv from 'dotenv';

dotenv.config();


export const connectDB = async ()=>{
    try {
        await mongoose.connect(`${process.env.DB_URI}`)
        .then(console.log("MONGODB connected"))
    } catch (error) {
        console.log("ERROR :",error);
    }
}



