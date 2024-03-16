import { debug_database, debug_user } from "../../utils/debuggers.ts";
import express from "express";
import UserModel from "../../models/users.model.ts";
import Joi from "joi";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import cookieParser from "cookie-parser";
import upload from "../../upload.ts";
import _ from "lodash";
import { validate } from "../../utils/utils.ts";
import { JWT_MAX_AGE, JWT_TOKEN, SALT_TOKEN } from "../../utils/config.ts";
import FileModel from "../../models/file.model.ts";
import { RequestWithId } from "../../types";
import { ObjectId } from "mongoose";
import {
  uploadDirectorySchema,
  uploadFileSchema,
  userLoginSchema,
  userRegisterSchema,
} from "./UserJoiSchemas.ts";

const SALT = bcrypt.genSaltSync(parseInt(SALT_TOKEN));

const app = express.Router();

// Routes

app.get("/", (req, res) => {
  res.send("Welcome new user");
});
function storeUserJwt(req: Request, res: Response, next: () => void) {}
app.post("/register", validate(userRegisterSchema), async (req, res, next) => {
  const hashedPass = await bcrypt.hash(req.body.password, SALT);
  const user: any = new UserModel({
    email: req.body.email,
    password: hashedPass,
    // files: [],

    fullName: req.body.fullName,
    friends: [],
    // rootDirectory: {},
  });
  const rootDirectory = new FileModel({
    name: req.body.fullName,
    owner: user.id,
    _type: "directory",
    content: [],
  });
  user.rootDirectory = rootDirectory.id;
  try {
    await user.save();
    await rootDirectory.save();

    const jwtToken = jwt.sign({ id: user.id }, JWT_TOKEN);
    res.cookie("jwtToken", jwtToken, { maxAge: JWT_MAX_AGE });
    res.status(200).send({ message: "Registered Successfully" });
  } catch (err: any) {
    let message = "An Error occurred in saving user";
    res.status(500).json({
      message,
    });
    debug_user(message, err.entries());
  }
});
function authenticateUser(req: any, res: any, next: () => void) {
  const jwtToken = req.cookies.jwtToken as string;
  try {
    if (!jwtToken) throw new Error("User Token Isn't present");
    let userData = jwt.verify(jwtToken, JWT_TOKEN) as { id: string };
    req.id = userData.id;
  } catch (err) {
    res.status(401).send("Unauthenticated");
    return;
  }
  next();
}

app.post("/auto-login", async (req, res, next) => {
  const jwtToken = req.cookies.jwtToken as string;

  try {
    if (!jwtToken) throw new Error("User Token Isn't present");
    let userData = jwt.verify(jwtToken, JWT_TOKEN) as { id: string };
    const user = await UserModel.findById(userData.id)
      .populate({ path: "friends" })
      .exec();
    if (!user) throw new Error("Invalid User Id");
    let dataToSend = _.pick(user, ["email", "files", "friends"]);
    res.json(dataToSend);
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
    let dataToSend = _.pick(user, ["email", "rootDirectory", "friends"]);
    if (authenticated) {
      const jwtToken = jwt.sign({ id: user.id }, JWT_TOKEN);
      res.cookie("jwtToken", jwtToken, { maxAge: JWT_MAX_AGE });
      res.json(dataToSend);
      return;
    }
  }
  res.status(403).send("Invalid Email or Password (Unauthorized)");
});

app.get("/files", authenticateUser, async (req: any, res) => {
  const id = req.id as string;
  const user: any = await UserModel.findById(id).populate({
    path: "rootDirectory",
  });
  res.status(200).json({
    files: user.rootDirectory,
  });
});

app.post(
  "/createDirectory",
  authenticateUser,
  validate(uploadDirectorySchema),
  async (req: any, res) => {
    const id = req.id as string;
    const user = await UserModel.findById(id);
    if (!user) return res.status(401).send("Cant find user account");

    const rootDirectoryId: string = req.body.rootDirectoryId;
    const rootDirectory = await FileModel.findById(rootDirectoryId);
    if (!rootDirectory) return res.status(401).send("Directory doesn't exist");
    if (user.id !== rootDirectory.owner.toString()) {
      return res.status(403).send("You are unAuthorized to Edit this Folder");
    }
  }
);
app.post(
  "/upload",
  authenticateUser,
  upload.single("file"),
  validate(uploadFileSchema),
  async (req: any, res) => {
    const id = req.id as string;

    const user = await UserModel.findById(id);
    if (!user) return res.status(401).send("Cant find user account");

    const rootDirectoryId: string = req.body.rootDirectoryId;
    const rootDirectory = await FileModel.findById(rootDirectoryId);
    if (!rootDirectory) return res.status(401).send("Directory doesn't exist");
    if (user.id !== rootDirectory.owner.toString()) {
      return res.status(403).send("You are unAuthorized to Edit this Folder");
    }
    const File = new FileModel({
      name: req.file.originalname,
      mimetype: req.file.mimetype,
      path: req.file.path,
      _type: "file",
      owner: req.id,
    });
    // user.files = [{ data: File.id, sharedTo: [] }];
    try {
      File.save();
      let folderContent = rootDirectory.content;
      folderContent.push(File.id);
      rootDirectory.content = folderContent;
      rootDirectory.save();
    } catch (err) {
      debug_user("An Error Uploading file");
      return res.status(500).send("An Error ocurred while uploading file");
    }

    res.status(200).json({ message: "File Created Successfully" });
  }
);
const UserRoute = app;
export default UserRoute;
