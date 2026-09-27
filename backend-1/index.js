const express = require('express')
const cors = require('cors')
const bodyParser = require("body-parser")
const router = require("./routes/router");
const stripeWebhook = require("./routes/stripe-webhook");
const mongoose = require("mongoose");
require("dotenv/config")
require("dotenv").config({
    path: process.env.NODE_ENV === 'development'
      ? './.env.development'
      : './.env.production'
  })


const app = express();


app.post("/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhook)


app.use(bodyParser.json({ limit: "15mb" }))


app.use(bodyParser.urlencoded({ extended: false, limit: "15mb" }))

const corsOptions = {
   origin:"*",
   credentials:true,
   optionSuccessStatus:200
}


app.use(cors(corsOptions));
app.use('/', router);


mongoose
.connect(process.env.DB_URI, {})
.then(() => console.log("MONGODB Connected!"))
.catch((err)=> console.log(err));


const port = process.env.PORT || 4000;


const server = app.listen(port, ()=>{
   console.log(`Server is running: PORT ${port}`)
})
