const { object, string } = require("yup");

const schemaPermission = object({
  value: string().required("Permission is required"),
});
module.exports = schemaPermission;
