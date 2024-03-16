import Joi from "joi";
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
});
export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(5).required(),
});
export const uploadFileSchema = Joi.object({
  rootDirectoryId: Joi.string().required(),
});
export const uploadDirectorySchema = Joi.object({
  rootDirectoryId: Joi.string().required(),
  name: Joi.string().required(),
});
