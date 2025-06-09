const jwt = require("jsonwebtoken");
const generateToken = (user, secretKey, expiresIn) => {
  return jwt.sign(user, secretKey, {
    algorithm: "HS256",
    expiresIn,
  });
};
module.exports = generateToken;
