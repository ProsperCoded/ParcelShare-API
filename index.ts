// Environments
// import
// debug_main(JWT_TOKEN, SALT_TOKEN);
import express from "express";
import mongoose from "mongoose";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import https from "https";
import fs from "fs";
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

// For Express protocol setting
app.set("trust proxy", true);
app.use("*", (req, res, next) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host") as string;
  const serverOrigin = `${protocol}://${host}`;
  res.setHeader("x-origin", serverOrigin);
  res.setHeader("x-host", host);
  next();
});
// Set Headers

app.use("*", (req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://localhost:5000",
    "https://parcelshare.netlify.app",
  ];
  const origin = req.headers.origin as string;
  // debug_main("client origin ", origin);
  res.setHeader("vary", "Origin");
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  // res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type, Origin, x-user-token"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Type, x-origin, x-host"
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
import UserRouter from "./routes/Users.ts/Users.ts";
import FilesRouter from "./routes/Files/Files.ts";
import OrganizationRouter from "./routes/Organizations/Organization.ts";
import { MONGODB_URI } from "./utils/config.ts";
import debug from "debug";
app.use("/users", UserRouter);
app.use("/files", FilesRouter);
app.use("/organizations", OrganizationRouter);

// Application Listener
// app.listen(PORT, () => {
//   console.log(`listening on PORT http://localhost:${PORT}`);
// });
const server = https.createServer(
  {
    key: fs.readFileSync(`./cert/localhost-key.pem`, "utf8"),
    cert: fs.readFileSync(`./cert/localhost.pem`, "utf8"),
  },
  app
);
server.on("connection", () => {
  console.log("Server is running on https://localhost:3000");
});
server.listen(3000);
