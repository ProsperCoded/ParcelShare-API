import Joi from "joi";
const user = Joi.object({
  username: Joi.string().lowercase().required(),
  password: Joi.string().min(5).required(),
});
export default user;
