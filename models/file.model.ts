import { string } from "joi";
import mongoose from "mongoose";

// export const FileSchema = new mongoose.Schema({
//   // fileType: {
//   //   type: String,
//   //   required: true,
//   //   enum: ["file", "directory"],
//   // },
//   name: String,

//   lastModified: String,
//   // For Only Files
//   fileSizeKilobyte: Number,
//   // For Only directories
//   // content: [],
// });

const FileSchema = new mongoose.Schema({
  name: String,
  path: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lastModified: String,

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
