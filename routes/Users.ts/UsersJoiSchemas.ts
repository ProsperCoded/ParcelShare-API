import Joi from "joi";
import mongoose from "mongoose";
export const userRegisterSchema = Joi.object({
  fullName: Joi.string()
    .required()
    .custom((value: String, helper) => {
      if (!value.includes("-")) {
        return helper.message({
          custom: 'Full Name must include a gap "-" to Do Separation ',
        });
      }
      return true;
    }),
  email: Joi.string().email().required(),
  password: Joi.string().min(5).required(),
  username: Joi.string().min(3),
  // registrationDate: Joi.date().required(),
});
export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(5).required(),
});
export const uploadFileSchema = Joi.object({
  rootDirectoryId: Joi.string()
    .length(24)
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message({
          custom: "rootDirectoryId must be of type ObjectID",
        });
      }
      return value;
    }, "Object Id Validation")
    .required(),
  // creationDate: Joi.date().required(),
});
export const createDirectorySchema = Joi.object({
  rootDirectoryId: Joi.string().required(),
  dirName: Joi.string().required(),
});
export const deleteFileSchema = Joi.object({
  rootDirectoryId: Joi.string()
    .length(24)
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message({
          custom: "rootDirectory must be of type ObjectID",
        });
      }
      return value;
    }, "Object Id Validation")
    .required(),
  fileId: Joi.string()
    .length(24)
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message({ custom: "FileId must be of type ObjectID" });
      }
      return value;
    }, "Object Id Validation")
    .required(),
});
export const deleteFilesSchema = Joi.object({
  rootDirectoryId: Joi.string()
    .length(24)
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message({
          custom: "rootDirectory must be of type ObjectID",
        });
      }
      return value;
    }, "Object Id Validation")
    .required(),
  fileIds: Joi.array().items(
    Joi.string()
      .length(24)
      .custom((value, helpers) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return helpers.message({ custom: "FileId must be of type ObjectID" });
        }
        return value;
      }, "Object Id Validation")
      .required()
  ),
});
export const renameFileSchema = Joi.object({
  // rootDirectoryId: Joi.string().required(),
  fileId: Joi.string()
    .length(24)
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message({ custom: "FileId must be of type ObjectID" });
      }
      return value;
    }, "Object Id Validation")
    .required(),
  name: Joi.string().required(),
});
export const updateProfileSchema = Joi.object({
  username: Joi.string().min(3),
  fullName: Joi.string().custom((value: String, helper) => {
    if (!value.includes("-")) {
      return helper.message({
        custom: 'Full Name must include a gap "-" to Do Separation ',
      });
    }
    return true;
  }),
});
