import { debug_database, debug_files } from "../../utils/debuggers.ts";
import express from "express";
import UserModel from "../../models/users.model.ts";
import upload from "../../upload.ts";
import _ from "lodash";
import { deleteFile, validate } from "../../utils/utils.ts";
import mongoose from "mongoose";
import FileModel from "../../models/files.model.ts";
import {
  deleteFilesSchema,
  moveFileSchema,
  updateFavoriteSchema,
  deleteFileSchema,
  renameFileSchema,
  createDirectorySchema,
  uploadFileSchema,
} from "./FilesSchemas.ts";
import { authenticateUser } from "../Users.ts/Users.ts";

const app = express.Router();

async function populateFileTree(fileId: String) {
  const file: any = await FileModel.findById(fileId).populate("content");
  if (!file) {
    console.error("File not found");
    return null;
  }

  // Recursively populate children if this file is a directory
  if (file._type === "directory" && file.content.length > 0) {
    for (let i = 0; i < file.content.length; i++) {
      file.content[i] = await populateFileTree(file.content[i].id.toString());
    }
  }
  return file;
}
export async function modifyEveryFile(
  fileId: string,
  modifier: (file: any) => any
) {
  let file: any = await FileModel.findById(fileId);
  if (file._type === "file") {
    file = modifier(file);
    // file.save();
  } else if (file._type === "directory" && file.content.length > 0) {
    for (let i = 0; i < file.content.length; i++) {
      await modifyEveryFile(file.content[i], modifier);
    }
  }
}
app.get("/", authenticateUser, async (req: any, res) => {
  const id = req.id as string;
  const user = await UserModel.findById(id);
  if (!user) return res.status(401).json({ message: "Unauthenticated" });
  let fileTree;
  try {
    fileTree = await populateFileTree(user.rootDirectory.toString());
  } catch (error) {
    // console.error("Error populating file tree:", error);
    debug_files("Error populating file tree", error);
    return res.status(500).json({
      message: "Error populating file tree",
      error,
    });
  }
  return res.status(200).json({
    files: fileTree.content,
  });
});

app.post(
  "/create-dir",
  authenticateUser,
  validate(createDirectorySchema),
  async (req: any, res) => {
    const id = req.id as string;
    const directoryName = req.body.dirName as string;

    const rootDirectoryId: string = req.body.rootDirectoryId;
    const rootDirectory = await FileModel.findById(rootDirectoryId);
    if (!rootDirectory)
      return res.status(401).json({ message: "Directory doesn't exist" });
    if (rootDirectory._type === "file")
      return res.status(400).json({
        message: "Invalid Request, Root Directory must be a valid Directory",
      });
    if (id !== rootDirectory.owner.toString()) {
      return res
        .status(403)
        .json({ message: "You are unAuthorized to Edit this Directory" });
    }

    const File = new FileModel({
      name: directoryName,
      _type: "directory",
      owner: req.id,
      lastModified: new Date(),
      content: [],
    });
    try {
      await File.save();
      rootDirectory.content.push(File.id);
      // folderContent.push(File.id);
      // rootDirectory.content = folderContent;
      await rootDirectory.save();
    } catch (err: any) {
      debug_database("An Error Uploading Directory :", err);
      // const errors = new Object(err.errors);
      debug_files("Error occurred in creating directory", err);
      return res.status(500).json({
        message: "Error occurred in creating directory",
        error: err,
      });
    }
    res.status(201).json({ message: "Directory Created Successfully" });
  }
);
app.post(
  "/upload",
  authenticateUser,
  upload.single("file"),
  validate(uploadFileSchema),
  async (req: any, res) => {
    const id = req.id as string;
    debug_files("file properties ", req.file);
    const rootDirectoryId: string = req.body.rootDirectoryId;

    const rootDirectory = await FileModel.findById(rootDirectoryId);
    if (!rootDirectory) return res.status(401).send("Directory doesn't exist");
    if (rootDirectory._type === "file")
      return res
        .status(400)
        .send("Invalid Request, Root Directory must be a valid Directory");
    if (id !== rootDirectory.owner.toString()) {
      return res.status(403).send("You are unAuthorized to Edit this Folder");
    }
    let fileSizeKilobyte = ((req.file.size as number) / 1024).toFixed(2);
    const File = new FileModel({
      name: req.file.originalname,
      mimetype: req.file.mimetype,
      path: req.file.path,
      _type: "file",
      owner: req.id,
      lastModified: new Date(),
      fileSizeKilobyte,
    });
    try {
      await File.save();
      let folderContent = rootDirectory.content;
      folderContent.push(File.id);
      rootDirectory.content = folderContent;
      await rootDirectory.save();
    } catch (err: any) {
      debug_database("An Error Uploading file", err);
      return res.status(500).json({
        message: "Error occurred in uploading file",
        error: err,
      });
    }
    res.status(201).json({ message: "File Created Successfully" });
  }
);
app.delete(
  "/file",
  authenticateUser,
  validate(deleteFileSchema),
  async (req: any, res) => {
    const id = req.id;
    const fileId = req.body.fileId;

    const rootDirectoryId: string = req.body.rootDirectoryId;
    const rootDirectory = await FileModel.findById(rootDirectoryId);
    if (!rootDirectory) return res.status(401).send("Directory doesn't exist");
    if (rootDirectory._type === "file")
      return res.status(400).json({
        message: "Invalid Request, Root Directory must be a valid Directory",
      });

    if (id !== rootDirectory.owner.toString())
      return res
        .status(403)
        .json({ message: "You are unAuthorized to Edit this Directory" });

    if (!rootDirectory.content.includes(fileId))
      return res.status(400).json({
        message:
          "Invalid Request, Root directory must be a direct parent of file",
      });

    try {
      const file = await FileModel.findByIdAndDelete(fileId);
      if (!file) return res.status(401).json({ message: "File doesn't exist" });
      rootDirectory.content = rootDirectory.content.filter((_fileId) => {
        return _fileId.toString() !== file.id;
      });
      await rootDirectory.save();
    } catch (err: any) {
      debug_database("An Error Deleting file");
      return res.status(500).json({
        message: "Error occurred in deleting file",
        error: Object.values(err.errors)[0],
      });
    }
    res.status(200).json({ message: "File Deleted Successfully" });
  }
);
app.delete(
  "/",
  authenticateUser,
  validate(deleteFilesSchema),
  async (req: any, res) => {
    const id = req.id;
    const fileIds = req.body.fileIds as string[];

    const rootDirectoryId: string = req.body.rootDirectoryId;
    const rootDirectory = await FileModel.findById(rootDirectoryId);
    if (!rootDirectory) return res.status(401).send("Directory doesn't exist");
    if (rootDirectory._type === "file")
      return res.status(400).json({
        message: "Invalid Request, Root Directory must be a valid Directory",
      });
    console.log("Root Directory and file", rootDirectory.content, fileIds);
    if (id !== rootDirectory.owner.toString())
      return res
        .status(403)
        .json({ message: "You are unAuthorized to Edit this Directory" });
    // mongoose.Types.ObjectId.is

    const matchingChildren = rootDirectory.content.filter((_fileId) => {
      let fid_string = _fileId.toString();
      if (fileIds.includes(fid_string)) return fid_string;
    });
    console.log(matchingChildren);
    if (matchingChildren.length !== fileIds.length) {
      return res.status(400).json({
        message:
          "Invalid Request, Root directory must be a direct parent of all files",
      });
    }
    try {
      for (let fileId of fileIds) {
        modifyEveryFile(fileId, async (f) => {
          await FileModel.findByIdAndDelete(f._id);
          if (f._type === "file") {
            deleteFile(f.path);
          }
        });
      }
      rootDirectory.content = rootDirectory.content.filter((_fileId) => {
        return !fileIds.includes(_fileId.toString());
      });
      await rootDirectory.save();
    } catch (err: any) {
      debug_database("An Error Deleting file", err);
      return res.status(500).json({
        message: "Error occurred in deleting file",
        error: err,
      });
    }
    res.status(201).json({ message: "File Deleted Successfully" });
  }
);
app.put(
  "/rename",
  authenticateUser,
  validate(renameFileSchema),
  async (req: any, res) => {
    const id: string = req.id;
    const newFileName = req.body.name;
    const file = await FileModel.findById(req.body.fileId);
    if (!file) return res.status(401).json({ message: "File doesn't exist" });
    if (id !== file.owner.toString())
      return res
        .status(403)
        .json({ message: "You are unAuthorized to Edit this Directory" });
    file.name = newFileName;
    await file.save();
    res.status(201).json({ message: "Name Updated Successfully" });
  }
);

app.put(
  "/files/move",
  authenticateUser,
  validate(moveFileSchema),
  async (req: any, res) => {
    const id = req.id;
    const fileIds: string[] = req.body.fileIds;
    const rootDirectoryId: string = req.body.rootDirectoryId;
    const newRootDirectoryId: string = req.body.newRootDirectoryId;

    const rootDirectory = await FileModel.findById(rootDirectoryId);
    const newRootDirectory = await FileModel.findById(newRootDirectoryId);
    if (!rootDirectory || !newRootDirectory)
      return res.status(401).send("Directory doesn't exist");
    if (rootDirectory._type === "file" || newRootDirectory._type === "file")
      return res.status(400).json({
        message: "Invalid Request, Directory must be a valid Directory",
      });

    if (
      id !== rootDirectory.owner.toString() ||
      id !== newRootDirectory.owner.toString()
    )
      return res
        .status(403)
        .json({ message: "You are unAuthorized to Edit this Directory" });
    const notMatchingChildren = rootDirectory.content.filter((_fileId) => {
      let fid_string = _fileId.toString();
      if (!fileIds.includes(fid_string)) return fid_string;
    });
    console.log({
      content: rootDirectory.content,
      notMatchingChildren,
      fileIds,
    });
    if (
      rootDirectory.content.length - notMatchingChildren.length !==
      fileIds.length
    ) {
      return res.status(400).json({
        message:
          "Invalid Request, Root directory must be a direct parent of all files",
      });
    }
    try {
      rootDirectory.content = notMatchingChildren;
      await rootDirectory.save();
      newRootDirectory.content = [
        ...newRootDirectory.content,
        ...fileIds.map((id) => new mongoose.Types.ObjectId(id)),
      ];
      await newRootDirectory.save();
    } catch (error) {
      debug_database("An Error Deleting file");
      return res.status(500).json({
        message: "Error occurred in moving file/files",
        error,
      });
    }
    res.status(201).json({ message: "File Moved Successfully" });
  }
);
app.put(
  "/update-favorite",
  authenticateUser,
  validate(updateFavoriteSchema),
  async (req: any, res) => {
    const id: string = req.id;
    const favorite: boolean = req.body.favorite;
    const fileIds: string[] = req.body.fileIds;
    try {
      for (let fileId of fileIds) {
        let file = await FileModel.findById(fileId);
        if (!file)
          return res.status(401).json({ message: "File doesn't exist" });
        if (id !== file.owner.toString())
          return res
            .status(403)
            .json({ message: "You are unAuthorized to Edit this Directory" });
        file.favorite = favorite;
        await file.save();
      }
    } catch (error) {
      res.status(500).json({
        message: "A Server Error occurred in updating favorites",
        error,
      });
    }
    res.status(201).json({ message: "Favorite Updated Successfully" });
  }
);
const FilesRouter = app;
export default FilesRouter;
