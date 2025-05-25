const sql = require("mssql");
const schemaCourse = require("../models/Course");
class CourseController {
  async index(req, res) {
    try {
      const {
        keyword,
        status,
        page = 1,
        limit = 10,
        sortOrder,
        sortBy,
      } = req.query;
      const isDeleted =
        req.query.isDeleted === undefined
          ? false
          : req.query.isDeleted === "true";

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
        conditions.push(`Name LIKE @keyword`);
        request.input("keyword", sql.NVarChar, `%${keyword}%`);
      }

      if (status) {
        conditions.push(`Status = @status`);
        request.input("status", sql.NVarChar, status);
      }
      if (isDeleted) {
        conditions.push(`IsDeleted = @isDeleted`);
        request.input("isDeleted", sql.Bit, isDeleted);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countQuery = `SELECT COUNT(*) AS total FROM COURSE ${whereClause}`;
      const countResult = await request.query(countQuery);
      const total = countResult.recordset[0].total;

      const dataRequest = new sql.Request();
      if (keyword) dataRequest.input("keyword", sql.NVarChar, `%${keyword}%`);
      if (status) dataRequest.input("status", sql.NVarChar, status);
      dataRequest.input("isDeleted", sql.Bit, isDeleted);
      const offset = (page - 1) * limit;
      dataRequest
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit);
      const dataQuery = `
        SELECT * FROM COURSE
        ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const dataResult = await dataRequest.query(dataQuery);

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
      console.error("Error in index:", error);
      res.status(500).json({
        error: "Internal Server Error",
      });
    }
  }

  async create(req, res, next) {
    try {
      const { name, price, status } = req.body;
      const request = new sql.Request();
      await schemaCourse.validate(req.body, {
        abortEarly: false,
      });
      const { recordset } = await request
        .input("Name", sql.NVarChar, name.trim())
        .input("Price", sql.Int, price)
        .input("Status", sql.Bit, status)
        .query(
          "INSERT INTO COURSE (Name, Price, Status) OUTPUT inserted.* VALUES (@name, @price, @status)"
        );
      return res.status(201).json({
        course: recordset[0],
      });
    } catch (e) {
      const errors = Object.fromEntries(
        e.inner.map((i) => [i.path, i.message])
      );
      req.flash(errors);
      return res.status(500).json({
        errors,
      });
    }
  }
  async update(req, res, next) {
    try {
      const { courseId } = req.params;
      const { name, price, status } = req.body;
      const fields = [];
      const request = new sql.Request();
      if (name) {
        request.input("Name", sql.NVarChar, name.trim());
        fields.push("Name = @Name");
      }
      if (price) {
        request.input("Price", sql.Int, price);
        fields.push("Price = @Price");
      }
      if (status) {
        request.input("Status", sql.Bit, status);
        fields.push("Status = @Status");
      }
      if (!fields.length) {
        return res.status(400).json({ message: "No data to update" });
      }
      request.input("Id", sql.Int, courseId);
      const query = `
      UPDATE COURSE
      SET ${fields.join(", ")}
      OUTPUT INSERTED.*
      WHERE Id = @Id
    `;
      const { recordset: course } = await request.query(query);
      if (!course[0])
        return res.status(404).json({ message: "Course not found" });
      return res.status(200).json({ course: recordset[0] });
    } catch (e) {
      const errors = Object.fromEntries(
        e.inner.map((i) => [i.path, i.message])
      );
      req.flash(errors);
      return res.status(500).json({
        errors,
      });
    }
  }
  async destroy(req, res, next) {
    try {
      const { courseId } = req.params;
      const checkRequest = new sql.Request();
      checkRequest.input("Id", sql.Int, courseId);
      const checkQuery = "SELECT * FROM COURSE WHERE Id = @Id";
      const { recordset: course } = await checkRequest.query(checkQuery);
      if (!course.length) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (!course.length) {
        return res.status(404).json({ message: "Course not found" });
      }
      const deleteRequest = new sql.Request();
      const fields = ["isDeleted = @IsDeleted", "DeletedAt = @DeletedAt"];
      deleteRequest.input("Id", sql.Int, courseId);
      deleteRequest.input("IsDeleted", sql.Bit, true);
      deleteRequest.input("DeletedAt", sql.DateTime, new Date().toISOString());
      const deleteQuery = `
      UPDATE COURSE SET ${fields.join(", ")} OUTPUT DELETED.* WHERE Id = @Id`;
      const { recordset: deleted } = await deleteRequest.query(deleteQuery);
      if (!deleted.length) {
        return res.status(500).json({ message: "Delete course failed" });
      }
      return res.status(200).json({
        message: "Course was deleted",
      });
    } catch (error) {
      next(error);
    }
  }
  async forceDestroy(req, res, next) {
    try {
      const { courseId } = req.params;
      const checkRequest = new sql.Request();
      checkRequest.input("Id", sql.Int, courseId);
      const checkQuery = "SELECT * FROM COURSE WHERE Id = @Id";
      const { recordset: course } = await checkRequest.query(checkQuery);
      if (!course.length) {
        return res.status(404).json({ message: "Course not found" });
      }
      const deleteRequest = new sql.Request();
      deleteRequest.input("Id", sql.Int, courseId);
      const deleteQuery = "DELETE FROM COURSE OUTPUT DELETED.* WHERE Id = @Id";
      const { recordset: deleted } = await deleteRequest.query(deleteQuery);
      if (!deleted.length) {
        return res.status(500).json({ message: "Delete course failed" });
      }
      return res.status(200).json({
        message: "Course was deleted",
      });
    } catch (error) {
      return res.status(500).json({
        error,
      });
    }
  }
}
module.exports = new CourseController();
