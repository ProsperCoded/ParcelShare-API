// Environments
// import
debug_main(JWT_TOKEN, SALT_TOKEN);
import express from "express";
import mongoose from "mongoose";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

// Debuggers
import { debug_database, debug_main } from "./utils/debuggers.ts";
// Connection Utilis

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
// Set Headers
app.use("*", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // res.setHeader("Access-Control-Expose-Headers", "x-auth-token");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", 3600);

  // Handle preflight requests (OPTIONS method)
  if (req.method === "OPTIONS") {
    // Respond successfully to preflight requests
    debug_main("running preflight");
    res.status(200);
    return res.end();
  }
  next();
});

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to Parcel Share");
});

// Adding routers
import UserRoute from "./routes/Users.ts/User.ts";
import { JWT_TOKEN, MONGODB_URI, SALT_TOKEN } from "./utils/config.ts";
app.use("/users", UserRoute);

// Application Listener
app.listen(PORT, () => {
  console.log(`listening on PORT http://localhost:${PORT}`);
});
