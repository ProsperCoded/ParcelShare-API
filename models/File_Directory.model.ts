import mongoose from "mongoose";

export const File_DirectorySchema = new mongoose.Schema({
  fileType: {
    type: String,
    required: true,
    enum: ["file", "directory"],
  },
  name: String,
  sharedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastModified: String,
  // For Only Files
  fileSizeKilobyte: Number,
  // For Only directories
  content: [],
});
File_DirectorySchema.virtual("contentRef", {
  ref: "FileOrDirectory",
  localField: "_id",
  foreignField: "content",
  justOne: false,
});