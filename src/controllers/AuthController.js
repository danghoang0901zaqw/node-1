const sql = require("mssql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class AuthController {
  async signIn(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }
      const request = new sql.Request();
      const { recordset: checkUser } = await request
        .input("email", sql.VarChar, email)
        .query(`SELECT * FROM [USER] WHERE Email=@email`);
      if (!checkUser[0]) {
        return res
          .status(400)
          .json({ message: "Email or password is incorrect" });
      }
      const isValidPassword = bcrypt.compareSync(
        password,
        checkUser[0].Password
      );
      if (!isValidPassword) {
        return res
          .status(400)
          .json({ message: "Email or password is incorrect" });
      }
      const accessToken =jwt.sign({
        id: checkUser[0].Id,
        name: checkUser[0].Name,
        email: checkUser[0].Email,
      } , process.env.JWT_SECRET_KEY, {
        algorithm: "HS256",
        expiresIn: process.env.EXPIRED_IN,
      })
      const { recordset: phoneRequest } = await new sql.Request().input(
        "userId",
        sql.Int,
        checkUser[0].Id
      ).query(`
      SELECT * FROM PHONE WHERE UserId=@userId`);
      const { Password: passUser, ...restData } = checkUser[0];
      return res.status(200).json({
        data: {
          ...restData,
          PhoneNumber: phoneRequest[0].PhoneNumber,
          accessToken,
        },
      });
    } catch (error) {}
  }
  async signOut(req, res, next) {
    try {
    } catch (error) {}
  }

  async forgotPassword(req, res, next) {
    try {
    } catch (error) {}
  }

  async changePassword(req, res, next) {
    try {
    } catch (error) {}
  }
}
module.exports = new AuthController();
