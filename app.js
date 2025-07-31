const express = require('express');
const Articles = require('./Routes/Articles');
const User = require('./Routes/User');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy')
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');


const cors  = require('cors');
const corsOptions = {
	origin :["http://localhost:5173" , "https://logbookkkn309.netlify.app"],
	methods: ['GET','POST','PATCH','DELETE'],            // Allow only GET and POST methods
    allowedHeaders: ['Content-Type','Authorization'], // Allow specific headers
    credentials: true   
};

app.use(cookieParser());
app.use(cors(corsOptions));
require('dotenv').config()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




app.use('/api/articles', Articles);
app.use('/api/auth',User);



// Start Server
const PORT = 3000;

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

