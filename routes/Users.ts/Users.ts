import { debug_database, debug_user } from "../../utils/debuggers.ts";
import express from "express";
import UserModel from "../../models/users.model.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import _ from "lodash";
import { deleteFile, validate } from "../../utils/utils.ts";
import mongoose from "mongoose";
import { JWT_MAX_AGE, JWT_PRIVATE_KEY, SALT } from "../../utils/config.ts";
import FileModel from "../../models/files.model.ts";
import {
  connectUserSchema,
  deleteUserSchema,
  updateProfileSchema,
  userLoginSchema,
  userRegisterSchema,
} from "./UsersJoiSchemas.ts";
import OrganizationModel from "../../models/organizations.model.ts";
import { modifyEveryFile } from "../Files/Files.ts";

const app = express.Router();

// vars
export const userSendOnly = [
  "email",
  "rootDirectory",
  "fullName",
  "username",
  "registrationDate",
  "organizations",
  "connections",
  "connectionsRequest",
  "shareTo",
  "shareFrom",
  "connectRequests",
];

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
  // add user to all the organizations
  if (userInfo.organizations) {
    for (let org of userInfo.organizations as string[]) {
      let organization = await OrganizationModel.findById(org);
      if (!organization)
        return res.status(404).json({ message: "Organization Does not exist" });
      if (organization.restriction === "private")
        return res.status(400).json({
          message: "Can't Join a private organization on registration",
        });
      organization.members.push({
        user: user._id,
        isAdmin: false,
      });
      organization.save();
    }
  }
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
      data: _.pick(user, userSendOnly),
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
  if (!jwtToken)
    return res.status(400).json({ message: "User Token Isn't present" });
  try {
    let userData = jwt.verify(jwtToken, JWT_PRIVATE_KEY) as { id: string };
    req.id = userData.id;
  } catch (err) {
    return res.status(401).send("Unauthenticated");
  }
  next();
}

app.get("/auto-login", authenticateUser, async (req: any, res, next) => {
  try {
    const id: string = req.id;
    const user = await UserModel.findById(id);
    // .populate([{ path: "friends" }, { path: "organizations" }])
    // .exec();
    if (!user)
      return res
        .status(401)
        .json({ message: "User Was not found(Unauthenticated)" });
    return res
      .status(200)
      .json({ message: "Successful", data: _.pick(user, userSendOnly) });
  } catch (err: any) {
    let msg = "An Error Occurred in Identifying User, please login instead";
    debug_user(msg, err);
    return res.status(500).json({ message: msg, error: err });
  }
});
app.post("/login", validate(userLoginSchema), async (req, res) => {
  const user: any = await UserModel.findOne({ email: req.body.email })
    .populate({ path: "connections" })
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
      return res.json({
        message: "Login Successfully",
        jwtToken: jwtToken,
        data: _.pick(user, userSendOnly),
      });
    }
  }
  res.status(403).send({ message: "Invalid Email or Password (Unauthorized)" });
});
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
  "/connect",
  authenticateUser,
  validate(connectUserSchema),
  async (req: any, res) => {
    let userId: string = req.id;
    let connectId = req.body.connectId;
    if (userId === connectId)
      return res.status(400).json({ message: "Can't connect to same user" });
    let user = await UserModel.findById(userId);
    if (!user)
      return res.status(403).json({ message: "You are not authenticated" });
    let connectUser = await UserModel.findById(connectId);
    if (!connectUser)
      return res.status(404).json({
        message:
          "The user you want to connect to wasn't found, please ensure the account isn't deleted",
      });
    try {
      user.connections.push(new mongoose.Types.ObjectId(connectId));
      await user.save();
    } catch (error) {
      let message =
        "An Error occurred in the server when trying create connection request with" +
          connectUser.username || connectUser.fullName;
      debug_user(message, error);
      return res.status(500).json({
        message,
        error,
      });
    }
    return res
      .status(200)
      .json({ message: "Connection Request Sent Successfully" });
  }
);
app.delete(
  "/",
  authenticateUser,
  validate(deleteUserSchema),
  async (req: any, res) => {
    const userId = req.id;
    let user = await UserModel.findById(userId);
    if (!user)
      return res.status(403).json({ message: "You are not authenticated" });
    const authenticated = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!authenticated)
      return res.status(403).json({
        message: "Invalid Password(unauthorized)",
      });
    try {
      let rootDirectory = user.rootDirectory.toString();
      await modifyEveryFile(rootDirectory, async (f) => {
        await FileModel.findByIdAndDelete(f._id);
        if (f._type === "file") {
          deleteFile(f.path);
        }
      });
      let ownedOrganizations = await OrganizationModel.deleteMany({
        owner: user._id,
      });
      debug_user(ownedOrganizations);
      await UserModel.findByIdAndDelete(user._id);
      return res.json({ message: "Account/User Was Deleted Successfully" });
    } catch (error) {
      let message = "A Server Error occurred in deleting account";
      debug_user(message, error);
      res.json({
        message,
        error,
      });
    }
  }
);
const UserRouter = app;
export default UserRouter;
