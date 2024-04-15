import Joi from "joi";
import fs from "fs";
import { debug_user } from "./debuggers.ts";
import mongoose from "mongoose";

export function validate(joiSchema: Joi.ObjectSchema<any>) {
  return (req: any, res: any, next: () => void) => {
    console.log("validate request body", req.body);
    let { error } = joiSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        message: error.message,
        error: error.message,
      });
      return;
    }
    next();
  };
}
export function deleteFile(path: string) {
  fs.rm(path, (e) => {
    debug_user(`removed file in ${path} successfully`, e);
  });
}
export const JoiObjectId = (msg = "Invalid ObjectId") => {
  return Joi.string()
    .length(24)
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message({ custom: msg });
      }
      return value;
    }, "Object Id Validation");
};
