// import mongoose from "mongoose";
// import {DB_NAME} from './constants';
import express from 'express';

// (async() => {
//    try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//         console.log("ERROR: ", error);
//         throw error;
//     })
//     app.listen(process.env.PORT, () => {
//         console.log(`App listening on port ${process.env.PORT}`)
//     })
//    } catch (error) {
//     console.error("ERROR: ", error);
//     throw error
//    }
// })()

import connectDB from "./db/index.js";
import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config({
    path : './.env'
})

connectDB()
.then(() => {
    app.on("ERROR: ", (err) => {
        console.log("ERROR: ", err);
        throw err;
    });
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("Mongo DB Connection failed !! ha yahi hai ", err);
})