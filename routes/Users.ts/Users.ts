import { debug_database, debug_user } from "../../utils/debuggers.ts";
import express from "express";
import UserModel from "../../models/users.model.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import cookieParser from "cookie-parser";
import upload from "../../upload.ts";
import _ from "lodash";
import { validate } from "../../utils/utils.ts";
import {
  JWT_MAX_AGE,
  JWT_PRIVATE_KEY,
  SALT,
  SALT_TOKEN,
} from "../../utils/config.ts";
import FileModel from "../../models/file.model.ts";
import {
  deleteFileSchema,
  renameFileSchema,
  updateProfileSchema,
  uploadDirectorySchema,
  uploadFileSchema,
  userLoginSchema,
  userRegisterSchema,
} from "./UsersJoiSchemas.ts";

const app = express.Router();

// vars
const dataToSend = [
  "email",
  "rootDirectory",
  "fullName",
  "username",
  "registrationDate",
  "friends",
  "shareTo",
  "shareFrom",
];
// Routes

app.get("/", (req, res) => {
  res.send("Welcome User");
});
function storeUserJwt(req: Request, res: Response, next: () => void) {}
app.post("/register", validate(userRegisterSchema), async (req, res, next) => {
  const hashedPass = await bcrypt.hash(req.body.password, SALT);
  debug_user("body:", req.body);
  const user: any = new UserModel({
    email: req.body.email,
    password: hashedPass,

    fullName: req.body.fullName,
    // rootDirectory: {},
    registrationDate: new Date(),
  });
  const rootDirectory = new FileModel({
    name: req.body.fullName,

    owner: user.id,
    _type: "directory",
    content: [],
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
function authenticateUser(req: any, res: any, next: () => void) {
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
    if (!user) throw new Error("Invalid User Id");
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
  res.status(403).send("Invalid Email or Password (Unauthorized)");
});
// app.post('/logout', (req, res)=>{})
async function populateFileTree(fileId: String) {
  try {
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
  } catch (error) {
    console.error("Error populating file tree:", error);
    return null;
  }
}

app.get("/files", authenticateUser, async (req: any, res) => {
  const id = req.id as string;
  const user = await UserModel.findById(id);
  if (!user) return res.status(401).send("Cant find user account");
  const fileTree = await populateFileTree(user.rootDirectory);
  res.status(200).json({
    files: fileTree.content,
  });
});

app.post(
  "/create-directory",
  authenticateUser,
  validate(uploadDirectorySchema),
  async (req: any, res) => {
    const id = req.id as string;
    const directoryName = req.body.name as string;
    // const creationDate = req.body.creationDate;
    // const user = await UserModel.findById(id);
    // if (!user)
    //   return res.status(401).json({ message: "Cant find user account" });

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
  "/upload",
  authenticateUser,
  upload.single("file"),
  validate(uploadFileSchema),
  async (req: any, res) => {
    const id = req.id as string;
    // const creationDate = req.body.creationDate;
    // const user = await UserModel.findById(id);
    // if (!user) return res.status(401).send("Cant find user account");

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
    const File = new FileModel({
      name: req.file.originalname,
      mimetype: req.file.mimetype,
      path: req.file.path,
      _type: "file",
      owner: req.id,
      lastModified: new Date(),
    });
    // user.files = [{ data: File.id, sharedTo: [] }];
    try {
      await File.save();
      let folderContent = rootDirectory.content;
      folderContent.push(File.id);
      rootDirectory.content = folderContent;
      await rootDirectory.save();
    } catch (err: any) {
      debug_database("An Error Uploading file");
      return res.status(500).json({
        message: "Error occurred in uploading file",
        error: Object.values(err.errors)[0],
      });
    }
    res.status(201).json({ message: "File Created Successfully" });
  }
);
app.delete(
  "/files",
  authenticateUser,
  validate(deleteFileSchema),
  async (req: any, res) => {
    const id = req.id;
    const fileId = req.body.fileId;

    // const user = await UserModel.findById(id);
    // if (!user) return res.status(401).send("Cant find user account");

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
      // _.pull(rootDirectory.content, file.id);
      await rootDirectory.save();
    } catch (err: any) {
      debug_database("An Error Deleting file");
      return res.status(500).json({
        message: "Error occurred in deleting file",
        error: Object.values(err.errors)[0],
      });
    }
    res.status(204).json({ message: "File Deleted Successfully" });
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
      debug_database("An Error Updating profile");
      return res.status(500).json({
        message: "Error occurred in updating user profile",
        error: Object.values(err.errors)[0],
      });
    }
  }
);

const UserRoute = app;
export default UserRoute;
