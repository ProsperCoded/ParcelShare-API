import Joi from "joi";
import mongoose from "mongoose";
import { JoiObjectId } from "../../utils/utils.ts";
export const validateCreateOrganization = Joi.object({
  name: Joi.string().min(3).required(),
  categories: Joi.array().items(Joi.string()),
  restriction: Joi.string().valid("public", "private").required(),
  //   passCode: Joi.when("restriction", {
  //     is: "private",
  //     then: Joi.string().required(),
  //     otherwise: Joi.string().empty(""),
  //   }),
  passCode: Joi.string().min(5).required(),
});
export const validateJoinOrganization = Joi.object({
  name: Joi.string(),
  organizationId: Joi.when("name", {
    is: Joi.exist(),
    then: Joi.string(),
    otherwise: Joi.string().required(),
  }),
  restriction: Joi.string().valid("public", "private").required(),
  passCode: Joi.when("restriction", {
    is: "private",
    then: Joi.string().required(),
    otherwise: Joi.string().allow(""),
  }),
});
export const validateDeleteOrganization = Joi.object({
  organizationId: JoiObjectId(
    "organizationId must be a valid ObjectID "
  ).required(),
  passCode: Joi.string().required(),
});
export const validateSearchOrganization = Joi.object({
  query: Joi.string().required().min(1),
});
export const validatePopulate = Joi.object({
  organizations: Joi.array().items(JoiObjectId().required()),
});
export const validateOrganizationExists = Joi.object({
  name: Joi.string().required(),
});
export const validateExitOrganization = Joi.object({
  organizationId: JoiObjectId().required(),
});
