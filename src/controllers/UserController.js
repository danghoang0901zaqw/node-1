const sql = require("mssql");
const bcrypt = require("bcrypt");
const schemaUser = require("../models/User");
class UserController {
  async index(req, res, next) {
    try {
      const {
        keyword,
        status,
        sortOrder = "Id",
        sortBy = "ASC",
        page = 1,
        limit = 10,
      } = req.query;
      const allowedSortFields = ["Id", "Name", "Price", "Status"];
      const allowedSortDirections = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortOrder)
        ? sortOrder
        : "Id";
      const sortDirection = allowedSortDirections.includes(sortBy.toUpperCase())
        ? sortBy.toUpperCase()
        : "ASC";
      const request = new sql.Request();
      const conditions = [];
      if (keyword) {
        request.input("keyword", sql.NVarChar, `%${keyword}%`);
        conditions.push(`Name LIKE @keyword or Email LIKE @keyword`);
      }
      if (status) {
        conditions.push(`Status = @status`);
        request.input("status", sql.NVarChar, status);
      }
      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const countQuery = `SELECT COUNT(*) AS total FROM [USER] U JOIN PHONE P ON U.Id = P.UserId ${whereClause} `;
      const countResult = await request.query(countQuery);
      const total = countResult.recordset[0].total;

      const dataRequest = new sql.Request();
      if (keyword) dataRequest.input("keyword", sql.NVarChar, `%${keyword}%`);
      if (status) dataRequest.input("status", sql.NVarChar, status);
      const offset = (page - 1) * limit;
      dataRequest
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit);
      const dataResult =
        await dataRequest.query(`SELECT U.Id, U.Name, U.Email, U.Status, U.CreatedAt ,P.PhoneNumber FROM [USER] U JOIN PHONE P ON U.Id = P.UserId ${whereClause} ORDER BY U.${sortField} ${sortDirection}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`);
      return res.status(200).json({
        data: dataResult.recordset,
        pagination: {
          page: +page,
          limit: +limit,
          total,
          totalPage: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        error
      });
    }
  }
  async create(req, res, next) {
    const transaction = new sql.Transaction();
    try {
      const { name, email, phoneNumber, password, status } = req.body;
      await schemaUser.validate(req.body, {
        abortEarly: false,
      });
      const userRequest = new sql.Request();
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashPassword = bcrypt.hashSync(password, salt);
      await transaction.begin();
      const { recordset } = await userRequest
        .input("name", sql.NVarChar, name.trim())
        .input("email", sql.VarChar, email)
        .input("password", sql.VarChar, hashPassword)
        .input("status", sql.Bit, status)
        .query(
          "INSERT INTO [USER] (Name, Email, Password,Status) OUTPUT inserted.* VALUES ( @name, @email, @password, @status)"
        );
      let dataPhone;
      if (recordset[0]) {
        const phoneRequest = new sql.Request();
        dataPhone = await phoneRequest
          .input("phoneNumber", sql.VarChar, phoneNumber)
          .input("userId", sql.Int, recordset[0].Id)
          .query(
            "INSERT INTO Phone (PhoneNumber, UserId) OUTPUT inserted.* VALUES ( @phoneNumber, @userId)"
          );
        await transaction.commit();
      }
      return res.status(201).json({
        user: {
          ...recordset[0],
          PhoneNumber: dataPhone.recordset[0].PhoneNumber,
        },
      });
    } catch (e) {
      if (transaction._aborted === false) {
        await transaction.rollback();
        return res.status(500).json({
          errors,
        });
      }
      const errors = Object.fromEntries(
        e.inner?.map((i) => [i.path, i.message])
      );
      req.flash(errors);
      return res.status(500).json({
        errors,
      });
    }
  }
  async update(req, res, next) {
    const transaction = new sql.Transaction();
    try {
      const { userId } = req.params;
      const { name, email, phoneNumber, status } = req.body;

      await transaction.begin();
      const request = transaction.request();

      const { recordset: userCheck } = await request
        .input("id", sql.Int, userId)
        .query("SELECT * FROM [USER] WHERE Id = @id");

      if (!userCheck[0]) {
        await transaction.rollback();
        return res.status(404).json({ message: "User not found" });
      }

      const updateFields = [];
      if (name) {
        request.input("name", sql.NVarChar, name);
        updateFields.push("Name = @name");
      }
      if (email) {
        request.input("email", sql.VarChar, email);
        updateFields.push("Email = @email");
      }
      if (status !== undefined) {
        request.input("status", sql.Bit, status);
        updateFields.push("Status = @status");
      }

      let updatedUser = userCheck[0];

      if (updateFields.length > 0) {
        request.input("updatedAt", sql.DateTime, new Date());
        updateFields.push("UpdatedAt = @updatedAt");

        const { recordset: updated } = await request.query(`
          UPDATE [USER]
          SET ${updateFields.join(", ")}
          OUTPUT INSERTED.*
          WHERE Id = @id
        `);
        updatedUser = updated[0];
      }

      let finalPhoneNumber = null;
      if (phoneNumber) {
        const { recordset: phoneCheck } = await request.query(
          "SELECT * FROM PHONE WHERE UserId = @id"
        );
        request.input("phoneNumber", sql.VarChar, phoneNumber);
        if (phoneCheck.length > 0) {
          request.input("updatedAtPhone", sql.DateTime, new Date());
          await request.query(`
            UPDATE PHONE
            SET PhoneNumber = @phoneNumber, UpdatedAt = @updatedAtPhone
            WHERE UserId = @id
          `);
        } else {
          await request.query(`
            INSERT INTO PHONE (PhoneNumber, UserId)
            VALUES (@phoneNumber, @id)
          `);
        }

        finalPhoneNumber = phoneNumber;
      } else {
        const { recordset: phone } = await request.query(`
          SELECT PhoneNumber FROM PHONE WHERE UserId = @id
        `);
        finalPhoneNumber = phone[0]?.PhoneNumber || null;
      }

      updatedUser.phoneNumber = finalPhoneNumber;

      await transaction.commit();
      return res.status(200).json({ data: updatedUser });
    } catch (error) {
      if (transaction._aborted === false) {
        await transaction.rollback();
      }
      return res.status(500).json({ error});
    }
  }
  async update(req, res, next) {
    const transaction = new sql.Transaction();
    try {
      const { userId } = req.params;
      const { name, email, phoneNumber, status } = req.body;

      await transaction.begin();
      const request = transaction.request();

      const { recordset: userCheck } = await request
        .input("id", sql.Int, userId)
        .query("SELECT * FROM [USER] WHERE Id = @id");

      if (!userCheck[0]) {
        await transaction.rollback();
        return res.status(404).json({ message: "User not found" });
      }

      const updateFields = [];
      if (name) {
        request.input("name", sql.NVarChar, name);
        updateFields.push("Name = @name");
      }
      if (email) {
        request.input("email", sql.VarChar, email);
        updateFields.push("Email = @email");
      }
      if (status !== undefined) {
        request.input("status", sql.Bit, status);
        updateFields.push("Status = @status");
      }

      let updatedUser = userCheck[0];

      if (updateFields.length > 0) {
        request.input("updatedAt", sql.DateTime, new Date());
        updateFields.push("UpdatedAt = @updatedAt");

        const { recordset: updated } = await request.query(`
        UPDATE [USER]
        SET ${updateFields.join(", ")}
        OUTPUT INSERTED.*
        WHERE Id = @id
      `);
        updatedUser = updated[0];
      }

      let finalPhoneNumber = null;

      if (phoneNumber) {
        const { recordset: phoneCheck } = await request.query(
          "SELECT * FROM PHONE WHERE UserId = @id"
        );

        request.input("phoneNumber", sql.VarChar, phoneNumber);

        if (phoneCheck.length > 0) {
          request.input("updatedAtPhone", sql.DateTime, new Date());
          await request.query(`
          UPDATE PHONE
          SET PhoneNumber = @phoneNumber, UpdatedAt = @updatedAtPhone
          WHERE UserId = @id
        `);
        } else {
          await request.query(`
          INSERT INTO PHONE (PhoneNumber, UserId)
          VALUES (@phoneNumber, @id)
        `);
        }

        finalPhoneNumber = phoneNumber;
      } else {
        const { recordset: phone } = await request.query(`
        SELECT PhoneNumber FROM PHONE WHERE UserId = @id
      `);
        finalPhoneNumber = phone[0]?.PhoneNumber || null;
      }

      updatedUser.phoneNumber = finalPhoneNumber;

      await transaction.commit();
      return res.status(200).json({ data: updatedUser });
    } catch (e) {
      if (transaction._aborted === false) {
        await transaction.rollback();
      }
      return res.status(500).json({
        e,
      });
    }
  }

  async destroy(req, res, next) {
    try {
    } catch (error) {}
  }
  async forceDestroy(req, res, next) {
    const transaction = new sql.Transaction();
    try {
      const { userId } = req.params;
      await transaction.begin();
      const request = transaction.request();

      const { recordset: userCheck } = await request
        .input("id", sql.Int, userId)
        .query("SELECT * FROM [USER] WHERE Id = @id");

      if (!userCheck[0]) {
        await transaction.rollback();
        return res.status(404).json({ message: "User not found" });
      }
      const { recordset: phoneDeleted } = await request.query(
        `DELETE FROM PHONE OUTPUT DELETED.* WHERE UserId = @id`
      );
      const { recordset: userDeleted } = await request.query(
        `DELETE FROM [USER] OUTPUT DELETED.* WHERE Id = @id`
      );
      if (!phoneDeleted.length || !userDeleted.length) {
        await transaction.rollback();
        return res.status(500).json({ message: "Delete user failed" });
      }
      await transaction.commit();
      return res.status(200).json({
        message: "User was deleted",
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
}
module.exports = new UserController();
