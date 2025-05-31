const nodemailer = require("nodemailer");
require("dotenv").config()
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendForgotPassword = async ({ to, name, url }) => {
  try {
    const info = await transporter.sendMail({
      from: '"Trần Đăng Hoàng(Admin)" <danghoang0901zaqw@gmail.com>',
      to,
      subject: "Your password reset token (valid for 10 min)",
      html: `
        <h1>Hi ${name},</h1>
        <p>Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${url}.
        (Website for this action not yet implemented.)</p>
        <p>Reset your password</p>
        <p>
        If you didn't forget your password, please ignore this email!,</p>`,
    });
    return info;
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  sendForgotPassword,
};
