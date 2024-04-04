import Joi from "joi";
import fs from "fs";
export function validate(joiSchema: Joi.ObjectSchema<any>) {
  return (req: any, res: any, next: () => void) => {
    console.log("validate request body", req.body);
    let { error } = joiSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        message: "Invalid Parameters Parameters Provided",
        error: error.message,
      });
      return;
    }
    next();
  };
}
export function deleteFile(path: string) {
  fs.rm(path, () => {
    console.log(`removed file in ${path} successfully`);
  });
}
