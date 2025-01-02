const Joi = require("joi");
const moment = require("moment");

exports.registerValidation = function (data) {
  const schema = Joi.object({
    first_name: Joi.string().min(1).max(128).required(),
    last_name: Joi.string().min(1).max(128).required(),
    email: Joi.string().min(1).max(128).email().required(),
    mobile_phone: Joi.string().min(1).max(13),
    birth_date: Joi.date().iso().less("now"),
    user_levels: Joi.number().min(1).max(9999).required(),
    password: Joi.string().min(6).required(),
    status: Joi.number().min(1).max(9999).positive().integer().required(),
    repeat_password: Joi.ref("password"),
  });
  return schema.validate(data);
};

exports.emailLoginValidation = function (data) {
  const schema = Joi.object({
    email: Joi.string().min(1).max(128).email().required(),
    password: Joi.string().min(6).required(),
  });

  return schema.validate(data);
};

// password: Joi.string()
// .min(6)
// .pattern(new RegExp("^[a-z+A-Z+0-9]{3,30}$"))
// .required()
