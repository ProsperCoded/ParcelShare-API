import mongoose from "mongoose";

const FileSchema = new mongoose.Schema({
  name: String,
  path: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  lastModified: {
    type: Date,
    required: true,
  },
  organizations: [],
  _type: {
    type: String,
    enum: ["file", "directory"],
    required: true,
  },
  // Only available in files
  fileSizeKilobyte: Number,
  mimeType: String,
  favorite: {
    type: Boolean,
    default: false,
  },
  // If it's a directory, store its content (files or directories)
  content: [{ type: mongoose.Schema.Types.ObjectId, ref: "Files" }],
});

const FileModel = mongoose.model("Files", FileSchema);
export default FileModel;
