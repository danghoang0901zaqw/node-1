const sql = require("mssql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");
const crypto = require("crypto");
const { sendForgotPassword } = require("../utils/email");

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
      const accessToken = generateToken(
        {
          id: checkUser[0].Id,
          name: checkUser[0].Name,
          email: checkUser[0].Email,
        },
        process.env.JWT_ACCESS_SECRET_KEY,
        process.env.EXPIRED_ACCESS_TOKEN_IN
      );
      const refreshToken = generateToken(
        {
          id: checkUser[0].Id,
          name: checkUser[0].Name,
          email: checkUser[0].Email,
        },
        process.env.JWT_REFRESH_SECRET_KEY,
        process.env.EXPIRED_REFRESH_TOKEN_IN
      );
      await new sql.Request()
        .input("refreshToken", sql.VarChar, refreshToken)
        .input("userId", sql.Int, checkUser[0].Id).query(`
      UPDATE [USER] SET RefreshToken=@refreshToken WHERE Id=@userId`);

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
          refreshToken,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  }
  async signOut(req, res, next) {
    try {
    } catch (error) {}
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is a required" });
      }
      const request = new sql.Request();
      const { recordset: checkUser } = await request
        .input("email", sql.VarChar, email)
        .query(`SELECT * FROM [USER] WHERE Email=@email`);
      if (!checkUser[0]) {
        return res.status(400).json({ message: "Email is not exists" });
      }
      const resetToken = crypto.randomBytes(32).toString("hex");
      const passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
      const resetURL = `${req.protocol}://${req.get(
        "host"
      )}/auth/reset-password/${resetToken}`;
      const infoMail = await sendForgotPassword({
        to: checkUser[0].Email,
        name: checkUser[0].Name,
        url: resetURL,
      });
      if (infoMail) {
        const { recordset: updateUser } = await new sql.Request()
          .input("id", sql.Bit, checkUser[0].Id)
          .input("passwordResetToken", sql.VarChar, passwordResetToken)
          .input("passwordResetExpires", sql.VarChar, passwordResetExpires)
          .query(`
            UPDATE [USER] 
            SET 
              PasswordResetToken=@passwordResetToken,
              PasswordResetExpires=@passwordResetExpires  
              OUTPUT INSERTED.*
            WHERE Id=@id
          `);
        if (updateUser[0]) {
          return res.status(200).json({ message: "Email sent successfully" });
        }
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        error,
      });
    }
  }
  async resetPassword(req, res, next) {
    try {
      // 1 Get user based on the token
      const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");
      // 2 If token has not expired, and there is user, set the new password
      const { recordset: checkUser } = await new sql.Request()
        .input("passwordResetToken", sql.VarChar, hashedToken)
        .input("currentTime", sql.DateTime, new Date())
        .query(
          `SELECT * 
          FROM [USER] 
          WHERE 
          PasswordResetToken=@passwordResetToken
            AND PasswordResetExpires > @currentTime
      `
        );
      if (!checkUser[0]) {
        return res
          .status(400)
          .json({ message: "Token is invalid or has expired" });
      }
      // 3 Update changedPasswordAt property for the given user
      const { recordset: updateUser } = await new sql.Request()
        .input("id", sql.Int, checkUser[0].Id)
        .input("password", sql.VarChar, bcrypt.hashSync(req.body.password, 10))
        .input("passwordResetToken", sql.VarChar, null)
        .input("passwordResetExpires", sql.DateTime, null).query(`
        UPDATE [USER] 
        SET 
        Password=@password,
        PasswordResetToken=@passwordResetToken,
        PasswordResetExpires=@passwordResetExpires
        OUTPUT INSERTED.* WHERE Id = @id
    `);
      if (!updateUser[0]) {
        return res.status(400).json({ message: "Failed to update user" });
      }
      return res.status(200).json({ message: "Password has been reset" });
    } catch (error) {
      return res.status(500).json(error);
    }
  }
  async changePassword(req, res, next) {
    try {
      const { password, newPassword } = req.body;
      if (!password || !newPassword) {
        return res
          .status(400)
          .json({ message: "Please enter both old and new password" });
      }
      const isMatchingPassword = bcrypt.compareSync(
        password,
        req.user.Password
      );
      if (!isMatchingPassword) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashPassword = bcrypt.hashSync(newPassword, salt);
      const { recordset: updateUser } = await new sql.Request()
        .input("id", sql.Int, req.user.Id)
        .input("password", sql.VarChar, hashPassword)
        .input("passwordChangedAt", sql.DateTime, new Date()).query(`
          UPDATE [USER] 
          SET 
            Password = @password,
            PasswordChangedAt=@passwordChangedAt  
            OUTPUT INSERTED.*
          WHERE Id=@id
        `);
      if (updateUser[0]) {
        return res
          .status(200)
          .json({ message: "Change password successfully" });
      }
      return res.status(400).json({ message: "Failed to change password" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        error,
      });
    }
  }
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }
      const decodeRefreshToken = await jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET_KEY
      );
      if (!decodeRefreshToken) {
        return res.status(403).json({
          message: "Forbidden",
        });
      }
      const { recordset: checkUser } = await new sql.Request()
        .input("refreshToken", sql.VarChar, refreshToken)
        .query(
          `
          SELECT * FROM [USER] WHERE RefreshToken=@refreshToken
          `
        );
      if (!checkUser[0]) {
        return res.status(404).json({
          message: "User is not exist",
        });
      }
      const accessToken = generateToken(
        {
          id: checkUser[0].Id,
          name: checkUser[0].Name,
          email: checkUser[0].Email,
        },
        process.env.JWT_ACCESS_SECRET_KEY,
        process.env.EXPIRED_ACCESS_TOKEN_IN
      );
      return res.status(200).json({
        data: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        error,
      });
    }
  }
}
module.exports = new AuthController();
