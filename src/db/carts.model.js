import mongoose from "mongoose";
import { Product } from "./products.model.js";
import { User } from "./users.models.js";

const cartSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required:true
    },
    qty : {
        type : Number,
        required : true,
        default:1,
        min:1
    },
    price:{
        type: Number,
        required:true,  
    }
},{timestamps:true})


export const Cart = mongoose.model('Cart', cartSchema);