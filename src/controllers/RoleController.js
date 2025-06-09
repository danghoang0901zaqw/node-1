const sql = require("mssql");
const schemaRole = require("../models/Role");
class RoleController {
  async index(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const data = await new sql.Request()
        .input("offset", sql.Int, +offset)
        .input("limit", sql.Int, +limit)
        .query(
          `SELECT * FROM ROLE ORDER BY Id  OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
        );
      return res.status(200).json({
        data: [...data.recordset],
        pagination: {
          page: +page,
          limit: +limit,
          total: data.rowsAffected[0],
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error });
    }
  }
  async create(req, res, next) {
    try {
      await schemaRole.validate(req.body, {
        abortEarly: false,
      });
      const { recordset: role } = await new sql.Request()
        .input("name", sql.NVarChar, req.body.name.trim())
        .query(`INSERT INTO ROLE (Name) OUTPUT INSERTED.* VALUES (@name)`);
      if (role[0]) {
        return res.status(201).json({
          data: {
            ...role[0],
          },
        });
      }
      return res.status(400).json({ message: "Create role failed" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error });
    }
  }
  async update(req, res, next) {
    try {
      const { roleId } = req.params;
      const { recordset: checkRoleExist } = await new sql.Request()
        .input("roleId", sql.Int, roleId)
        .query(`SELECT Id FROM ROLE WHERE Id=@roleId`);
      if (!checkRoleExist[0]) {
        return res.status(404).json({
          message: "Role not found",
        });
      }
      const { recordset: role } = await new sql.Request()
        .input("roleId", sql.NVarChar, req.params.roleId)
        .input("name", sql.NVarChar, req.body.name.trim())
        .query(`UPDATE ROLE SET Name=@name OUTPUT INSERTED.* WHERE Id=@roleId`);
      if (role[0]) {
        return res.status(201).json({
          data: {
            ...role[0],
          },
        });
      }
      return res.status(400).json({ message: "Update role failed" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error });
    }
  }
  async destroy(req, res, next) {
    const transaction = new sql.Transaction();
    try {
      const { roleId } = req.params;
      const checkRequest = new sql.Request();
      const { recordset: checkRoleExist } = await checkRequest
        .input("roleId", sql.Int, roleId)
        .query(`SELECT Id FROM ROLE WHERE Id = @roleId`);
      if (!checkRoleExist[0]) {
        return res.status(404).json({ message: "Role not found" });
      }
      await transaction.begin();
      const request = new sql.Request(transaction);

      await request
        .input("roleId", sql.Int, roleId)
        .query(`DELETE FROM ROLE_PERMISSION WHERE RoleId = @roleId`);

      await request.query(`
        DELETE FROM PERMISSION
        WHERE Id NOT IN (SELECT DISTINCT PermissionId FROM ROLE_PERMISSION)
      `);

      await request.query(`DELETE FROM ROLE WHERE Id = @roleId`);

      await transaction.commit();
      return res.status(200).json({ message: "Role was deleted" });
    } catch (error) {
      console.error(error);
      if (transaction._aborted === false) {
        await transaction.rollback();
      }
      return res.status(500).json({ error });
    }
  }
}
module.exports = new RoleController();
