import express from "express";
import mongoose from "mongoose";
//
import dotenv from "dotenv";
dotenv.config();
import bodyParser from "body-parser";

import cookieParser from "cookie-parser";
import { debug_database, debug_main } from "./utils/debuggers.ts";
// Connection Utilis
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE = "ParcelShare";
const DATABASE_URI = `${MONGODB_URI}${DATABASE}`;
debug_database(DATABASE_URI);

// Connect to Database
const conn = await mongoose.connect(DATABASE_URI);
console.log("Connected to database successfully 🌟");

// Create Main Route
const app = express();

// const connectionString = process.env.DB_STRING;
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
// app.use(cookieParser())

// Routes
app.get("/", (req, res) => {
  const foo = process.env.a;
  res.send(foo);
});

// Adding routers
import UserRoute from "./routes/User.ts";
app.use("/users", UserRoute);

// Application Listener
app.listen(PORT, () => {
  console.log(`listening on PORT http://localhost:${PORT}`);
});
