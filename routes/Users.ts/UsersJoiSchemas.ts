import Joi from "joi";
import mongoose from "mongoose";
import { JoiObjectId } from "../../utils/utils.ts";
// Pre forms

export const userRegisterSchema = Joi.object({
  fullName: Joi.string()
    .required()
    .max(30)
    .custom((value: String, helper) => {
      if (!value.includes("-")) {
        return helper.message({
          custom: 'Full Name must include a gap "-" to Do Separation ',
        });
      }
      return true;
    }),
  email: Joi.string().email().required(),
  password: Joi.string().max(20).required(),
  username: Joi.string().max(20).min(0),
  organizations: Joi.array().items(
    JoiObjectId("organizations items must be of type ObjectID").required()
  ),
});
export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(5).required(),
});
export const uploadFileSchema = Joi.object({
  rootDirectoryId: JoiObjectId(
    "rootDirectoryId must be of type ObjectID"
  ).required(),
});
export const createDirectorySchema = Joi.object({
  rootDirectoryId: Joi.string().required(),
  dirName: Joi.string().required(),
});
export const deleteFileSchema = Joi.object({
  rootDirectoryId: JoiObjectId(
    "rootDirectoryId must be of type ObjectID"
  ).required(),
  fileId: JoiObjectId("fileId must be of type ObjectID").required(),
});
export const deleteFilesSchema = Joi.object({
  rootDirectoryId: JoiObjectId(
    "rootDirectoryId must be of type ObjectID"
  ).required(),
  fileIds: Joi.array().items(
    JoiObjectId("fileId must be of type ObjectID").required()
  ),
});
export const renameFileSchema = Joi.object({
  // rootDirectoryId: Joi.string().required(),
  fileId: JoiObjectId("fileId must be of type ObjectID").required(),
  name: Joi.string().required(),
});
export const updateProfileSchema = Joi.object({
  email: Joi.string().email(),
  username: Joi.string().min(3).max(20),
  fullName: Joi.string().custom((value: String, helper) => {
    if (!value.includes("-")) {
      return helper.message({
        custom: 'Full Name must include a gap "-" to Do Separation ',
      });
    }
    return true;
  }),
  organization: Joi.string().max(20).min(0),
});
export const moveFileSchema = Joi.object({
  fileIds: Joi.array().items(
    JoiObjectId("fileId must be of type ObjectID").required()
  ),
  rootDirectoryId: JoiObjectId(
    "rootDirectoryId must be of type ObjectID"
  ).required(),
  newRootDirectoryId: JoiObjectId(
    "rootDirectoryId must be of type ObjectID"
  ).required(),
});
export const updateFavoriteSchema = Joi.object({
  fileIds: Joi.array().items(
    JoiObjectId("fileId must be of type ObjectID").required()
  ),
  favorite: Joi.boolean().required(),
});
