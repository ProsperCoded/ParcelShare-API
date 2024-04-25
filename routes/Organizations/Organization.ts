import { debug_database, debug_organization } from "../../utils/debuggers.ts";
import express from "express";
import UserModel from "../../models/users.model.ts";
import bcrypt from "bcrypt";
import _ from "lodash";
import mongoose from "mongoose";
import { SALT } from "../../utils/config.ts";
import OrganizationModel from "../../models/organizations.model.ts";
import { authenticateUser, userSendOnly } from "../Users.ts/Users.ts";
import { validate } from "../../utils/utils.ts";
import {
  validateCreateOrganization,
  validateDeleteOrganization,
  validateExitOrganization,
  validateJoinOrganization,
  validateOrganizationExists,
  validateSearchOrganization,
} from "./OrganizationSchemas.ts";
const organizationSendOnly = [
  "members",
  "name",
  "categories",
  "restriction",
  "_id",
];
const app = express.Router();
app.get("/", async (req, res) => {
  let publicOrganizations = await OrganizationModel.find({
    restriction: "public",
  })
    .select({ name: 1, members: 1 })
    .populate({ path: "members.user" })
    .sort({ members: 1 });
  res.json(publicOrganizations);
});
app.post(
  "/search",

  validate(validateSearchOrganization),
  async (req, res) => {
    let regex = new RegExp(req.body.query, "i");
    let publicSearchResults = await OrganizationModel.find({
      restriction: "public",
      name: { $regex: regex },
    }).select({ name: 1, members: 1 });
    publicSearchResults.sort((a, b) => {
      return b.members.length - a.members.length;
    });
    return res.json(publicSearchResults);
  }
);
app.post(
  "/exists",
  authenticateUser,
  validate(validateOrganizationExists),
  async (req, res) => {
    let organizationExist = await OrganizationModel.findOne({
      name: req.body.name,
    });
    if (organizationExist)
      return res.status(200).json({ message: "Organization Exists" });
    res.status(404).json({ message: "Doesn't Exists" });
  }
);
app.get("/populate", authenticateUser, async (req: any, res) => {
  let userId = req.id;
  let user = await UserModel.findById(userId).populate({
    path: "organizations",
    select: [...organizationSendOnly, "owner"],
    populate: { path: "members.user", select: userSendOnly },
  });
  if (!user) return res.status(404).json({ message: "User doesn't exist" });
  let organizations = (user.organizations as any[]).map((org) => {
    let toSend = _.pick(org, organizationSendOnly);
    return {
      ...toSend,
      isOwner: user!.id === (org.owner as mongoose.Types.ObjectId).toString(),
    };
  });
  res.json(organizations);
  // user?.organizations.
  // let organizations = [];
  // let organizationIds: string[] = req.body.organizations;
  // for (let orgId of organizationIds) {
  //   let organization = await OrganizationModel.findById(orgId).populate({
  //     path: "members.user",
  //   });
  //   if (!organization)
  //     return res.status(404).json({ message: "organization doesn't exist" });
  //   userId = new mongoose.Types.ObjectId(userId);
  //   if (
  //     !organization.members.find((member) => {
  //       return member.user === org;
  //     })
  //   ) {
  //     return res
  //       .status(403)
  //       .json({ message: "You aren't a member of one of the organizations" });
  //   }
  //   organizations.push(organization);
  // }
  // res.status(200).json(organizations);
});
app.post(
  "/",
  authenticateUser,
  validate(validateCreateOrganization),
  async (req: any, res) => {
    let userId: any = req.id;
    const user = await UserModel.findById(userId);
    if (!user) return res.status(401).json({ message: "Not Authenticated" });
    let organizationExist = await OrganizationModel.findOne({
      name: req.body.name,
    });
    if (organizationExist)
      return res.status(403).json({
        message: `Organization with name '${req.body.name}' already exist`,
      });

    let organization = new OrganizationModel({
      ...req.body,
      owner: userId,
      members: [{ user: userId, isAdmin: true }],
      passCode: await bcrypt.hash(req.body.passCode, SALT),
    });
    user.organizations.push(organization.id);
    try {
      await organization.save();
      await user.save();
    } catch (err) {
      let errMsg = "An Error occurred, while creating organization";
      debug_organization(errMsg, err);
      return res.status(500).json({
        message: errMsg,
        error: JSON.stringify(err),
      });
    }
    res.status(201).json({ message: "Organization Created Successfully" });
  }
);
app.put(
  "/join",
  authenticateUser,
  validate(validateJoinOrganization),
  async (req: any, res) => {
    let organizationId: string = req.body.organizationId;
    let userId: string = req.id;
    let organization;
    if (organizationId)
      organization = await OrganizationModel.findById(organizationId);
    else
      organization = await OrganizationModel.findOne({ name: req.body.name });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(401).json({ message: "Not Authenticated" });
    if (!organization)
      return res
        .status(404)
        .json({ message: "Can't Find specified Organization" });
    if (organization.restriction === "private") {
      let passCode: string = req.body.passCode;
      let isValidPass = await bcrypt.compare(passCode, organization.passCode);
      if (!isValidPass) {
        return res.status(403).json({ message: "Invalid Passcode Provided" });
      }
    }

    if (
      organization.members.find((e) => {
        // let id = new mongoose.Types.ObjectId(e.user);
        return (e.user as mongoose.Types.ObjectId).toString() === userId;
      })
    ) {
      return res
        .status(403)
        .json({ message: "You are already a member of this organization" });
    }
    organization.members.push({ user: user._id, isAdmin: false });
    user.organizations.push(organization.id);
    try {
      await organization.save();
      await user.save();
    } catch (err) {
      let errMsg = "An Error occurred, in adding user to organization";
      debug_organization(errMsg, err);
      return res.status(500).json({
        message: errMsg,
        error: JSON.stringify(err),
      });
    }
    res
      .status(201)
      .json({ message: `${organization.name} joined Successfully` });
  }
);
app.put(
  "/exit",
  authenticateUser,
  validate(validateExitOrganization),
  async (req, res) => {
    let userId = (req as any).id;
    let organizationId = req.body.organizationId;
    let user = await UserModel.findById(userId);
    let organization = await OrganizationModel.findById(organizationId);
    if (!user) return res.status(401).json({ message: "Not Authenticated" });
    if (!organization && organization === null)
      return res
        .status(404)
        .json({ message: "Can't Find specified Organization" });
    if (
      user.id === (organization.owner as mongoose.Types.ObjectId).toString()
    ) {
      return res
        .status(400)
        .json({ message: "can't exit group you created, please terminate" });
    }
    try {
      user.organizations = user.organizations.filter((org) => {
        return org.toString() !== organization!.id;
      });
      organization.members = (organization as any).members.filter(
        (org: any) => {
          return (org.user as mongoose.Types.ObjectId).toString() !== user!.id;
        }
      );
      await user.save();
      await organization.save();
    } catch (err: any) {
      let errMsg = "An Error occurred, in exiting organization";
      debug_organization(errMsg, err);
      return res.status(500).json({
        message: errMsg,
        error: JSON.stringify(err),
      });
    }
    res.json({ message: `Exited ${organization.name} successfully` });
  }
);
app.delete(
  "/",
  authenticateUser,
  validate(validateDeleteOrganization),
  async (req: any, res) => {
    let userId: string = req.id;
    let organizationId: string = req.body.organizationId;
    let user = await UserModel.findById(userId);
    if (!user) return res.status(401).json({ message: "Unauthenticated" });

    let organization = await OrganizationModel.findById(organizationId);
    if (!organization)
      return res.status(404).json({ message: "Organization Not found" });
    if (organization.owner !== user._id)
      return res.status(403).json({
        message:
          "Only The Creator of this Organization, has the permission to delete it",
      });

    try {
      for (let member of organization.members) {
        let user = await UserModel.findById(member.user);
        user!.organizations = user!.organizations.filter(
          (e) => e.toString() !== organization!.id
        );
        await user!.save();
      }
      await OrganizationModel.deleteOne({ _id: organization.id });
    } catch (err) {
      let errMsg = "An Error occurred, in deleting organization";
      debug_organization(errMsg, err);
      return res.status(500).json({
        message: errMsg,
        error: JSON.stringify(err),
      });
    }
    res.status(204).json({ message: "Organization Deleted Successfully" });
  }
);
const OrganizationRouter = app;
export default OrganizationRouter;
