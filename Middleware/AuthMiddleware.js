require('dotenv').config();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access Denied' });

  try {
    const user = jwt.verify(token, process.env.ACCESS_SECRET_TOKEN);
	console.log(user);
    req.user = user;
    next(); 
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token', error: err.message });
  }
};


exports.isAdmin = (req, res, next) => {
	
  if (!req.user || req.user.Role !== "Admin") {
    return res.status(403).json({ user : req.user , message: 'Access forbidden: Admins only' });
  }
  next(); 
};

exports.otpRateLimiter =  rateLimit({
							windowMs: 2 * 60 * 1000, 
							max: 3, 
							message: { message: 'Terlalu banyak percobaan OTP, coba lagi nanti.' },
							standardHeaders: true,
							legacyHeaders: false,
						});
	
