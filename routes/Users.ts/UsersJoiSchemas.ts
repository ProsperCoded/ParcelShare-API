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
    JoiObjectId("organizations items must be of type ObjectID")
  ),
});
export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(5).required(),
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
export const connectUserSchema = Joi.object({
  connectId: JoiObjectId("Must be a valid userId"),
});
export const deleteUserSchema = Joi.object({
  password: Joi.string().min(5).required(),
});
export const fetchProfilesUserSchema = Joi.object({
  usersId: Joi.array().items(JoiObjectId().required()),
});
export const fetchProfileUserSchema = Joi.object({
  usersId: JoiObjectId().required(),
});
export const acceptConnectUserSchema = Joi.object({
  acceptedConnectId: JoiObjectId().required(),
});
export const disconnectUserSchema = Joi.object({
  connectionId: JoiObjectId().required(),
});
export const validateCancelConnection = Joi.object({
  cancelConnectId: JoiObjectId().required(),
});
