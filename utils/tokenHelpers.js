const jwt = require("jsonwebtoken");

const generateToken = (user,expiresIn ='2hr')=>{
  const userId = typeof user === 'object' ? user._id : user;
  const userEmail = typeof user ==='object'?user.email:user;
  const userRole = typeof user ==='object'?user.role:user;

  const payload = {
    id: userId,
    email : userEmail,
    role: userRole

  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn }
  );
}


module.exports = generateToken;