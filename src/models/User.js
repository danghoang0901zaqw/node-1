const { object, string, ref } = require("yup");
const sql = require("mssql");
const schemaUser = object({
  name: string()
    .required("Name is not empty")
    .max(50, "Name is not over 50 characters"),
  email: string()
    .required("Name is not empty")
    .email("Must be a valid email")
    .test("check-email-unique", "Email is not a duplicate", async (value) => {
      if (!value) return false;
      const request = new sql.Request();
      const { recordset } = await request
        .input("email", sql.VarChar, value)
        .query("SELECT COUNT(*) AS count FROM [USER] WHERE Email = @email");
      return recordset[0].count === 0;
    })
    .max(100, "Email is not over 100 characters"),
  phoneNumber: string()
    .required("Phone number is not empty")
    .test("validate-phone-number", (value) => {
      const regexPhoneNumber = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
      return regexPhoneNumber.test(value);
    })
    .test(
      "check-phone-number-unique",
      "Phone number is not a duplicate",
      async (value) => {
        if (!value) return false;
        const request = new sql.Request();
        const { recordset } = await request
          .input("phoneNumber", sql.VarChar, value)
          .query(
            "SELECT COUNT(*) AS count FROM PHONE WHERE PhoneNumber = @phoneNumber"
          );
        return recordset[0].count === 0;
      }
    )
    .min(10, "Phone number is least 8 numbers")
    .max(11, "Phone number is not over 15 numbers"),
  password: string()
    .required("Password is not empty")
    .min(8, "Password is least 8 characters")
    .max(20, "Password is not over 20 characters"),
  confirmPassword: string()
    .required("Confirm password is not empty")
    .oneOf([ref("password")], "Confirm password does not match password"),
});
module.exports = schemaUser;
