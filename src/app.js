import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.urlencoded({extended : true}));
app.use(express.static("public"));
app.use(cookieParser());
app.use(express.json({limit: '16kb'}));

// routes import 
import userRouter from './routes/user.routes.js';
import {registerUser} from './controllers/user.controllers.js';

//routes declaration
// app.use("/api/v1/users", userRouter);

app.use("/api/v1/users", userRouter);


export {app}