const sql = require("mssql");
class PermissionController {
  async index(req, res, next) {
    try {
      const { roleId, page = 1, limit = 10 } = req.query;
      if (!roleId) {
        return res.status(400).json({ message: "roleId is required" });
      }
      const offset = (page - 1) * limit;
      const data = await new sql.Request()
        .input("roleId", sql.Int, +roleId)
        .input("offset", sql.Int, +offset)
        .input("limit", sql.Int, +limit)
        .query(
          `
          SELECT P.*
          FROM PERMISSION P
            JOIN ROLE_PERMISSION RP ON P.Id=RP.PermissionId
            JOIN ROLE R ON R.Id=RP.RoleId
          WHERE R.Id=@roleId
          ORDER BY P.Id  
          OFFSET @offset ROWS 
          FETCH NEXT @limit ROWS ONLY`
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
    const transaction = new sql.Transaction();
    try {
      const { roleId } = req.query;
      const { permissions } = req.body || {};
      if (!roleId)
        return res.status(400).json({ message: "roleId is required" });
      if (!permissions?.length)
        return res.status(400).json({ message: "Permissions is required" });

      const checkRequest = new sql.Request();
      const { recordset: checkRoleExist } = await checkRequest
        .input("roleId", sql.Int, roleId)
        .query(`SELECT Id,Name FROM ROLE WHERE Id = @roleId`);
      if (!checkRoleExist[0]) {
        return res.status(404).json({ message: "Role not found" });
      }
      await transaction.begin();
      const requests = [];

      for (const permission of permissions) {
        const { recordset } = await new sql.Request().input(
          "value",
          sql.VarChar,
          permission
        ).query(`
            INSERT INTO PERMISSION (Value)
            OUTPUT INSERTED.*
            VALUES (@value)
          `);
        requests.push(recordset[0]);
      }

      for (const perm of requests) {
        await new sql.Request()
          .input("roleId", sql.Int, +roleId)
          .input("permissionId", sql.Int, perm.Id).query(`
            INSERT INTO ROLE_PERMISSION (RoleId, PermissionId)
            OUTPUT INSERTED.*
            VALUES (@roleId, @permissionId)
          `);
      }

      await transaction.commit();

      return res.status(200).json({
        data: {
          roleId: +roleId,
          name: checkRoleExist[0].Name,
          permissions: [...requests],
        },
      });
    } catch (error) {
      if (transaction._aborted === false) {
        await transaction.rollback();
      }
      return res.status(500).json({
        error,
      });
    }
  }
  async update(req, res, next) {
    try {
    } catch (error) {
      return res.status(500).json({ error });
    }
  }
  async destroy(req, res, next) {
    try {
    } catch (error) {
      return res.status(500).json({ error });
    }
  }
}
module.exports = new PermissionController();
