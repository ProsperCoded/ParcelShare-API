import Joi from "joi";
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
