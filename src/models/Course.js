const { object, string } = require("yup");
const sql = require("mssql");

const schemaCourse = object({
  name: string()
    .required("Name please")
    .test("check-unique", "Name is not a duplicate", async (value) => {
      if (!value) return false;
      const request = new sql.Request();
      const { recordset } = await request
        .input("name", sql.NVarChar, value)
        .query("SELECT COUNT(*) AS count FROM COURSE WHERE Name = @name");
      return recordset[0].count === 0;
    }),
  price: string()
    .required("Price please")
    .test("check-number", "Price must be a number", (value) => {
      return !isNaN(value);
    }),
});
module.exports = schemaCourse;
