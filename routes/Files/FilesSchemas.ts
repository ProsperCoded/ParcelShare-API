import Joi from "joi";
import { JoiObjectId } from "../../utils/utils.ts";
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
