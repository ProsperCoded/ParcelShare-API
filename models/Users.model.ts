import mongoose from "mongoose";
import { File_DirectorySchema } from "./File_Directory.model";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  files: [File_DirectorySchema],
});

const UserModel = mongoose.model("User", UserSchema);
export default UserModel;
