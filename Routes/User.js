const express = require('express')
const router = express.Router();
const {loginUser , logoutUser , checkAuth , createOTPNumber , validateOTPNumber , resetPassword} = require('../Controller/UserController');
const {otpRateLimiter} = require('../Middleware/AuthMiddleware');
express.json()

router.post('/login' , loginUser );

router.delete('/logout' , logoutUser);

router.get('/check', checkAuth );

router.post('/reset' , resetPassword);

router.post('/otp' , createOTPNumber);

router.post('/otp/validate' , otpRateLimiter,  validateOTPNumber);



module.exports = router;

