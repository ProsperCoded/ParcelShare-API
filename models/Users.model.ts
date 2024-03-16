import mongoose from "mongoose";
// import { File_DirectorySchema } from "./file.model.ts";
import { UserModelType } from "../types";

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
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // files: [
  //   {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "File",
  //     required: true,
  //   },
  // ],
  rootDirectory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
    required: true,
  },
});

const UserModel = mongoose.model<UserModelType>("User", UserSchema);
export default UserModel;
