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
  username: Joi.string().min(3),
  // registrationDate: Joi.date().required(),
});
export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(5).required(),
});
export const uploadFileSchema = Joi.object({
  rootDirectoryId: Joi.string().required(),
  // creationDate: Joi.date().required(),
});
export const uploadDirectorySchema = Joi.object({
  rootDirectoryId: Joi.string().required(),
  name: Joi.string().required(),
  // creationDate: Joi.date().required(),
});
export const deleteFileSchema = Joi.object({
  rootDirectoryId: Joi.string().required(),
  fileId: Joi.string().required(),
});
export const renameFileSchema = Joi.object({
  // rootDirectoryId: Joi.string().required(),
  fileId: Joi.string().required(),
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
