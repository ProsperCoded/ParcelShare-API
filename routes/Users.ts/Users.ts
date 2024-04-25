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
  acceptConnectUserSchema,
  connectUserSchema,
  deleteUserSchema,
  disconnectUserSchema,
  fetchProfileUserSchema,
  fetchProfilesUserSchema,
  updateProfileSchema,
  userLoginSchema,
  userRegisterSchema,
  validateCancelConnection,
} from "./UsersJoiSchemas.ts";
import OrganizationModel from "../../models/organizations.model.ts";
import { modifyEveryFile } from "../Files/Files.ts";

const app = express.Router();

// vars
export const userSendOnly = [
  "_id",
  "email",
  "rootDirectory",
  "fullName",
  "username",
  "registrationDate",
  "organizations",
  "connections",
  "connectionRequests",
  "shareTo",
  "shareFrom",
  "connectRequests",
];
export const userProfileSendOnly = [
  "_id",
  "fullName",
  "username",
  "registrationDate",
  "connections",
];
// Routes

app.get("/", (req, res) => {
  res.send("Welcome User");
});
// Should be a get request, but due to the need to include a body in the request i learnt i can't use get for that
app.post(
  "/fetch-profiles",
  authenticateUser,
  validate(fetchProfilesUserSchema),
  async (req, res) => {
    let usersId: string[] = req.body.usersId;
    let users = await UserModel.find({ _id: { $in: usersId } }).select(
      userProfileSendOnly
    );
    debug_user("users profiles", users);
    res.json(users);
  }
);
// Should be a get request, but due to the need to include a body in the request i learnt i can't use get for that
app.post(
  "/fetch-profile",
  authenticateUser,
  validate(fetchProfileUserSchema),
  async (req, res) => {
    let userId: string = req.body.userId;
    let user = await UserModel.findById(userId).select(userProfileSendOnly);
    debug_user("user profiles", user);
    res.json(user);
  }
);
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

app.get("/sign-in", authenticateUser, async (req: any, res, next) => {
  try {
    const id: string = req.id;
    const user = await UserModel.findById(id);
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
  "/connections/accept-connect",
  authenticateUser,
  validate(acceptConnectUserSchema),
  async (req, res) => {
    let userId = (req as any).id;
    let acceptedConnectId: string = req.body.acceptedConnectId;
    let user = await UserModel.findById(userId);
    if (!user) return res.status(401).json({ message: "Not Authenticated" });
    let acceptedUser = await UserModel.findById(acceptedConnectId);
    if (!acceptedUser)
      return res.status(404).json({ message: "Accepted User wasn't found" });
    if (
      !user.connectionRequests.find(
        (req) => req.toString() === acceptedUser!.id
      )
    )
      return res
        .status(403)
        .json({ message: "Sorry This isn't a valid request" });
    if (
      !acceptedUser.connectRequests.find((req) => req.toString() === user!.id)
    )
      return res
        .status(403)
        .json({ message: "Sorry This isn't a valid request" });
    try {
      user.connections.push(acceptedUser._id);
      acceptedUser.connections.push(user._id);
      user.connectionRequests = user.connectionRequests.filter(
        (req) => req.toString() !== acceptedUser!.id
      );
      // _.pullAllBy(acceptedUser.connectRequests, [user._id]);
      acceptedUser.connectRequests = acceptedUser.connectRequests.filter(
        (_user) => _user.toString() !== user!.id
      );
      await user.save();
      await acceptedUser.save();
    } catch (error) {
      let message = "An error occurred in accepting " + acceptedUser.fullName;
      debug_user(message, error);
      return res.status(500).json({ message, error });
    }
    return res.status(201).json({});
  }
);
app.put(
  "/connections/cancel-request",
  authenticateUser,
  validate(validateCancelConnection),
  async (req, res) => {
    let userId = (req as any).id;
    let cancelConnectId: string = req.body.cancelConnectId;
    let user = await UserModel.findById(userId);
    if (!user) return res.status(401).json({ message: "Not Authenticated" });
    // The canceled user, user to be canceled from connection requests.
    let cancelUser = await UserModel.findById(cancelConnectId);
    if (!cancelUser)
      return res.status(404).json({ message: "User wasn't found" });
    if (!user.connectRequests.find((req) => req.toString() === cancelUser!.id))
      return res
        .status(403)
        .json({ message: "Sorry This isn't a valid request" });
    if (
      !cancelUser.connectionRequests.find((req) => req.toString() === user!.id)
    )
      return res
        .status(403)
        .json({ message: "Sorry This isn't a valid request" });

    try {
      user.connectRequests = user.connectRequests.filter((req) => {
        return req.toString() !== cancelUser!.id;
      });
      cancelUser.connectionRequests = user.connectionRequests.filter((req) => {
        return req.toString() !== user!.id;
      });

      await user.save();
      await cancelUser.save();
    } catch (error) {
      let message = "An error occurred in accepting " + cancelUser.fullName;
      debug_user(message, error);
      return res.status(500).json({ message, error });
    }
    return res.status(201).json({});
  }
);
app.put(
  "/connections/remove",
  authenticateUser,
  validate(disconnectUserSchema),
  async (req, res) => {
    let userId = (req as any).id;
    let connectionId = req.body.connectionId;
    let user = await UserModel.findById(userId);
    if (!user) return res.status(401).json({ message: "Not Authenticated" });
    let connection = await UserModel.findById(connectionId);
    if (!connection)
      return res.status(404).json({ message: "Connection wasn't found" });
    try {
      user.connections = user.connections.filter((conn) => {
        return conn.toString() !== connection!.id;
      });
      connection.connections = connection.connections.filter((conn) => {
        return conn.toString() !== user!.id;
      });
      await user.save();
      await connection.save();
    } catch (error) {
      let message = `Error Removing ${connection.fullName} from connection`;
      debug_user(message, error);
      return res.status(500).json({ message, error });
    }
    return res.status(201).json({});
  }
);
app.put(
  "/connections/connect",
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
      user.connectRequests.push(connectUser._id);
      connectUser.connectionRequests.push(user._id);
      await user.save();
      await connectUser.save();
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
    if (!user || user === null)
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
      // delete all files
      await modifyEveryFile(rootDirectory, async (f) => {
        await FileModel.findByIdAndDelete(f._id);
        if (f._type === "file") {
          deleteFile(f.path);
        }
      });
      // delete all organizations

      // remove user from all organization where he is a member
      for (let org of user.organizations) {
        let organization = (await OrganizationModel.findById(org)) as any;
        if (organization && organization.owner.toString() !== user.id) {
          organization.members = organization.members.filter((member: any) => {
            return member.user.toString() !== user!.id;
          });
          organization.save();
        }
      }
      let ownedOrganizations = await OrganizationModel.deleteMany({
        owner: user._id,
      });
      // Remove all connections
      for (let conn of user.connections) {
        let connection = await UserModel.findById(conn);
        if (!connection) continue;
        connection.connections = connection.connections.filter((conn) => {
          return conn.toString() !== connection!.id;
        });
        connection.save();
      }
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
