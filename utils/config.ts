import dotenv from "dotenv";

import bcrypt from "bcrypt";
dotenv.config();
let env = ["SALT_TOKEN", "JWT_PRIVATE_KEY", "MONGODB_URI"];
env.forEach((v) => {
  if (!process.env[v]) {
    throw new Error(`Environment Variable "${v}" is not defined`);
  }
});

// console.log("dir name", __dirname);
export const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY as string;
export const SALT_TOKEN = process.env.SALT_TOKEN as string;
export const SALT = bcrypt.genSaltSync(parseInt(SALT_TOKEN));
// export const SALT = "";
export const MONGODB_URI = process.env.MONGODB_URI;
export const JWT_MAX_AGE = 120_00000;
