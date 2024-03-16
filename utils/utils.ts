import Joi from "joi";
export function validate(joiSchema: Joi.ObjectSchema<any>) {
  return (req: any, res: any, next: () => void) => {
    let { error } = joiSchema.validate(req.body);
    if (error) {
      res.json({ error: error.message });
      return;
    }
    next();
  };
}
