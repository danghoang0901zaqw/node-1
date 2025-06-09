const { object, string } = require("yup");
const sql = require("mssql");

const schemaRole = object({
  name: string()
    .required("Role is required")
    .test("check-role-unique", "Role is not a duplicate", async (value) => {
      if (!value) return false;
      const request = new sql.Request();
      const { recordset } = await request
        .input("name", sql.NVarChar, value)
        .query("SELECT COUNT(*) AS count FROM ROLE WHERE Name = @name");
      return recordset[0].count === 0;
    }),
});
module.exports = schemaRole;
