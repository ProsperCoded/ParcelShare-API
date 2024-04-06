import { debug_database, debug_user } from "../../utils/debuggers.ts";
import express from "express";
import UserModel from "../../models/users.model.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import cookieParser from "cookie-parser";
import upload from "../../upload.ts";
import _ from "lodash";
import { deleteFile, validate } from "../../utils/utils.ts";
import mongoose from "mongoose";
import { JWT_MAX_AGE, JWT_PRIVATE_KEY, SALT } from "../../utils/config.ts";
import FileModel from "../../models/files.model.ts";
import {
  deleteFileSchema,
  renameFileSchema,
  updateProfileSchema,
  createDirectorySchema,
  uploadFileSchema,
  userLoginSchema,
  userRegisterSchema,
  deleteFilesSchema,
  moveFileSchema,
  updateFavoriteSchema,
} from "./UsersJoiSchemas.ts";

const app = express.Router();

// vars
const dataToSend = [
  "email",
  "rootDirectory",
  "fullName",
  "username",
  "registrationDate",
  "organization",
  "friends",
  "shareTo",
  "shareFrom",
];

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

async function modifyEveryFile(fileId: string, modifier: (file: any) => any) {
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

// Routes

app.get("/", (req, res) => {
  res.send("Welcome User");
});

app.post("/register", validate(userRegisterSchema), async (req, res, next) => {
  const hashedPass = await bcrypt.hash(req.body.password, SALT);
  debug_user("body:", req.body);
  let userInfo = _.pickBy(req.body, (value) => value && value !== null);
  const user: any = new UserModel({
    ...userInfo,
    password: hashedPass,
    registrationDate: new Date(),
  });
  const rootDirectory = new FileModel({
    name: req.body.fullName,

    owner: user.id,
    _type: "directory",
    lastModified: new Date(),
  });
  user.rootDirectory = rootDirectory.id;
  try {
    await user.save();
    await rootDirectory.save();

    const jwtToken = jwt.sign({ id: user.id }, JWT_PRIVATE_KEY);
    res.cookie("jwtToken", jwtToken, { maxAge: JWT_MAX_AGE });
    res.status(200).json({
      message: "Registered Successfully",
      jwtToken,
      data: _.pick(user, dataToSend),
    });
  } catch (err: any) {
    let message = "An Error occurred in saving user";

    debug_database(message, err.message);
    return res.status(500).json({
      message: "Error occurred in deleting file",
      error: err.message,
    });
  }
});
export function authenticateUser(req: any, res: any, next: () => void) {
  const jwtToken = (req.cookies.jwtToken ||
    req.headers["x-user-token"]) as string;
  try {
    if (!jwtToken) throw new Error("User Token Isn't present");
    let userData = jwt.verify(jwtToken, JWT_PRIVATE_KEY) as { id: string };
    req.id = userData.id;
  } catch (err) {
    res.status(401).send("Unauthenticated");
    return;
  }
  next();
}

app.get("/auto-login", authenticateUser, async (req: any, res, next) => {
  try {
    const id: string = req.id;
    const user = await UserModel.findById(id)
      .populate({ path: "friends" })
      .exec();
    if (!user) res.status(401).send("Invalid User Id");
    res
      .status(200)
      .json({ message: "Successful", data: _.pick(user, dataToSend) });
  } catch (err: any) {
    res.status(401).send("Unauthenticated");
    return;
  }
});
app.post("/login", validate(userLoginSchema), async (req, res) => {
  const user: any = await UserModel.findOne({ email: req.body.email })
    .populate({ path: "friends" })
    .exec();
  if (user) {
    const authenticated = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (authenticated) {
      const jwtToken = jwt.sign({ id: user.id }, JWT_PRIVATE_KEY);
      res.cookie("jwtToken", jwtToken, {
        maxAge: JWT_MAX_AGE,
        httpOnly: false,
        secure: true,
        sameSite: "none",
      });
      res.json({
        message: "Login Successfully",
        jwtToken: jwtToken,
        data: _.pick(user, dataToSend),
      });
      return;
    }
  }
  res.status(403).send({ message: "Invalid Email or Password (Unauthorized)" });
});

app.get("/files", authenticateUser, async (req: any, res) => {
  const id = req.id as string;
  const user = await UserModel.findById(id);
  if (!user) return res.status(401).send("Cant find user account");
  let fileTree;
  try {
    fileTree = await populateFileTree(user.rootDirectory.toString());
  } catch (error) {
    console.error("Error populating file tree:", error);
    return null;
  }
  res.status(200).json({
    files: fileTree.content,
  });
});

app.post(
  "/files/create-dir",
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

    // debug_user("creation date", creationDate);
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
      return res.status(500).json({
        message: "Error occurred in creating directory",
        error: Object.values(err.errors)[0],
      });
    }
    res.status(201).json({ message: "Directory Created Successfully" });
  }
);
app.post(
  "/files/upload",
  authenticateUser,
  upload.single("file"),
  validate(uploadFileSchema),
  async (req: any, res) => {
    const id = req.id as string;
    debug_user("file properties ", req.file);
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
  "/files",
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
  "/files/rename",
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
  "/profile",
  authenticateUser,
  validate(updateProfileSchema),
  async (req: any, res) => {
    try {
      const user = await UserModel.findByIdAndUpdate(
        req.id,
        {
          $set: {
            ...req.body,
          },
        },
        { new: true }
      );
      if (!user) return res.status(401).send("Cant find user account");
      res
        .status(201)
        .json({ message: "Profile Has Being Updated", data: { user } });
    } catch (err: any) {
      debug_database("An Error Updating profile", err);
      return res.status(500).json({
        message: "Error occurred in updating user profile",
        error: JSON.stringify(err),
      });
    }
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
  "/files/update-favorite",
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
const UserRoute = app;
export default UserRoute;
