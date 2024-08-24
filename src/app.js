import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.urlencoded({extended : true}));
app.use(express.static("pubic"));
app.use(cookieParser());
app.use(express.json({limit: '16kb'}));

