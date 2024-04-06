import Joi from "joi";
import mongoose from "mongoose";
import { JoiObjectId } from "../../utils/utils.ts";
export const validateCreateOrganization = Joi.object({
  name: Joi.string().min(3).required(),
  categories: Joi.array().items(Joi.string()),
  restriction: Joi.string().valid("public", "private").required(),
  passCode: Joi.when("restriction", {
    is: "private",
    then: Joi.string().required(),
    otherwise: Joi.string().empty(""),
  }),
});
export const validateJoinOrganization = Joi.object({
  organizationId: JoiObjectId(
    "organizationId must be a valid ObjectID "
  ).required(),
  passCode: Joi.string(),
});
export const validateDeleteOrganization = Joi.object({
  organizationId: JoiObjectId(
    "organizationId must be a valid ObjectID "
  ).required(),
  passCode: Joi.string().required(),
});
