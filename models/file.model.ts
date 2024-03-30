import { string } from "joi";
import mongoose from "mongoose";

const FileSchema = new mongoose.Schema({
  name: String,
  path: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lastModified: {
    type: Date,
    required: true,
  },

  _type: {
    type: String,
    enum: ["file", "directory"],
    required: true,
  },
  // Only available in files
  fileSizeKilobyte: Number,
  mimeType: String,

  // If it's a directory, store its content (files or directories)
  content: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
});

const FileModel = mongoose.model("File", FileSchema);
export default FileModel;
