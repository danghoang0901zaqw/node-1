const jwt = require("jsonwebtoken");
const sql = require("mssql");
const isAuthorized = async (req, res, next) => {
  try {
    const headers = req.headers;
    if (!headers || !headers?.authorization?.startsWith("Bearer")) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const token = headers.authorization.slice("Bearer ".length);
    const decodeToken = await jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (decodeToken) {
      const { recordset } = await new sql.Request().input(
        "id",
        sql.Int,
        decodeToken.id
      ).query(`
        SELECT U.*,P.PhoneNumber 
        FROM [USER] U JOIN PHONE P 
        ON U.Id = P.UserId 
        WHERE U.Id = @id 
      `);
      if (!recordset[0]) {
        return res.status(401).json({
          message: "The user belonging to this token does no longer exist.",
        });
      }
      // Check if user changed password after the token was issued
      if (
        recordset[0].PasswordChangedAt &&
        recordset[0].PasswordChangedAt.getTime() > decodeToken.iat * 1000
      ) {
        return res.status(401).json({
          message: "User recently changed password! Please log in again.",
        });
      }
      req.user = recordset[0];
    }
    next();
  } catch (error) {
    let message = error.message;
    if (error.message.includes("invalid token")) {
      message = "Unauthorized";
    }
    if (error.message.includes("jwt expired")) {
      message = "Token expired";
    }
    return res.status(401).json({
      message,
    });
  }
};
module.exports = {
  isAuthorized,
};
