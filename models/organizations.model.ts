import { boolean } from "joi";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  categories: { type: [{ type: String }], default: [] },
  owner: { type: mongoose.Types.ObjectId, ref: "Users", required: true },
  members: {
    type: [
      {
        user: { type: mongoose.Types.ObjectId, ref: "Users", required: true },
        isAdmin: Boolean,
      },
    ],
    default: [],
  },
  restriction: {
    type: String,
    enum: ["public", "private"],
  },
  passCode: {
    type: String,
    default: "",
  },
});
const OrganizationModel = mongoose.model("Organizations", OrganizationSchema);
export default OrganizationModel;
