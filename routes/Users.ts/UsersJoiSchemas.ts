import Joi from "joi";
import mongoose from "mongoose";
// Pre forms
const JoiObjectIdFile = Joi.string()
  .length(24)
  .custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.message({ custom: "FileId must be of type ObjectID" });
    }
    return value;
  }, "Object Id Validation");
const JoiObjectIdDirectory = Joi.string()
  .length(24)
  .custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.message({
        custom: "rootDirectoryId must be of type ObjectID",
      });
    }
    return value;
  }, "Object Id Validation");
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
  rootDirectoryId: JoiObjectIdDirectory.required(),
});
export const createDirectorySchema = Joi.object({
  rootDirectoryId: Joi.string().required(),
  dirName: Joi.string().required(),
});
export const deleteFileSchema = Joi.object({
  rootDirectoryId: JoiObjectIdDirectory.required(),
  fileId: JoiObjectIdFile.required(),
});
export const deleteFilesSchema = Joi.object({
  rootDirectoryId: JoiObjectIdDirectory.required(),
  fileIds: Joi.array().items(JoiObjectIdFile.required()),
});
export const renameFileSchema = Joi.object({
  // rootDirectoryId: Joi.string().required(),
  fileId: JoiObjectIdFile.required(),
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
export const moveFileSchema = Joi.object({
  fileIds: Joi.array().items(JoiObjectIdFile.required()),
  rootDirectoryId: JoiObjectIdDirectory.required(),
  newRootDirectoryId: JoiObjectIdDirectory.required(),
});
export const updateFavoriteSchema = Joi.object({
  // rootDirectoryId: Joi.string().required(),
  fileIds: Joi.array().items(JoiObjectIdFile.required()),
  favorite: Joi.boolean().required(),
});
