import { debug_database, debug_user } from "../utils/debuggers.ts";
import express from "express";
import UserModel from "../models/Users.model.ts";
import Joi from "joi";
const app = express.Router();

app.use((req, res, next) => {
  debug_user("Request received in user");
  next();
});
app.get("/", (req, res) => {
  res.send("Welcome new user");
});

const UserRoute = app;
export default UserRoute;
