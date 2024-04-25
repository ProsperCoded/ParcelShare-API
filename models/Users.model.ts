import mongoose from "mongoose";
// import { File_DirectorySchema } from "./file.model.ts";
import { SALT } from "../utils/config.ts";
import bcrypt from "bcrypt";
const UserSchema = new mongoose.Schema({
  // first
  fullName: {
    type: String,
    validator: (v: String) => {
      v.includes("-");
    },
    required: true,
  },
  firstName: {
    type: String,
    get: function () {
      let fullName = (this as any).fullName as string;
      return fullName.substring(0, fullName.indexOf("-"));
    },
  },
  lastName: {
    type: String,
    get: function () {
      let fullName = (this as any).fullName as string;
      return fullName.substring(fullName.indexOf("-"));
    },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  connections: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
    default: [],
  },
  // Request sent to you
  connectionRequests: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
    default: [],
  },
  // Request you sent
  connectRequests: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
    default: [],
  },
  username: String,
  organizations: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organizations",
        required: true,
      },
    ],
    default: [],
    required: true,
  },

  rootDirectory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
    required: true,
  },
});

const UserModel = mongoose.model("Users", UserSchema);
export default UserModel;
