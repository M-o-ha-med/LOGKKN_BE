require('dotenv').config();
const bcrypt = require('bcrypt');        
const jwt = require('jsonwebtoken');     
const pool = require('../Database/db');	
var speakeasy = require("speakeasy");
const transporter = require('../Mailer/mailer');
const rateLimit = require('express-rate-limit');

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    // Validasi input (cek apakah email dan password ada)
    if (!email || !password) {
        return res.status(400).json({ message: 'email and password are required' });
    }

    try {
        // Cari user berdasarkan username di database
        const user = await pool.query("SELECT user_id,email,password  FROM users WHERE email =$1" , [email]);

		
		if(user.rows.length == 0) return res.status(400).json({ message: 'Invalid email or password' });
		
		
		 
        // Cek apakah password yang dimasukkan cocok dengan yang ada di database
        const validPassword = await new Promise((resolve,reject) => { 
				bcrypt.compare(password, user.rows[0].password , function (error , result){
				if (error) return reject(error)
				resolve(result)
			});
		});

        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
		const payload = {
			_id: user.rows[0].user_id,              
			email: user.rows[0].email,
			state : true
		}

        // Buat token JWT yang berisi id dan email user
        const access_token = jwt.sign( payload , `${process.env.ACCESS_SECRET_TOKEN}`, { expiresIn: '1h' });
		
		
		res.cookie('token' , access_token , {
					  httpOnly: true,
					  secure: true,
					  sameSite: 'none',
					  maxAge: 3600000, // 1 hour
					});

		
		return res.status(200).json({ message: 'Login successful'} );


		
       

		
    } catch (err) {
        // Tangani error jika terjadi
        return res.status(500).json({ message: err.message , code: "GYATT"});
    }
	
};


exports.checkAuth = async (req, res, next) => {
  const token = req.cookies?.token;
  
  try{
	  const payload = jwt.verify(token , process.env.ACCESS_SECRET_TOKEN);
	  req.user = payload; // attach user to request
      return res.status(200).json({user : payload , token : token});
	  
  }
  
  catch(e){
	  return res.status(200).json({ user : null  , token : null});
  }
};

exports.logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true, // sesuaikan dengan deployment (false untuk dev)
    sameSite: 'none',
  });

  
  
  return res.status(200).json({ message: 'Logout successful' });
  

};






exports.createOTPNumber = async (req , res) => {
	
	try {
		const otp = await speakeasy.totp({
			secret : process.env.SPEAKEASY_SECRET ,
			encoding : 'base32',
			digits : 5,
			window : 10
			
			
		});
	
		const {email} = req.body;
			
		await transporter.sendMail({
			from : process.env.SENDER_EMAIL,
			to : email,
			subject : 'OTP for password reset',
			html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
		})
		
		res.status(200).json({ message: 'OTP sent successfully' });
	}
	
	catch(err) {console.error(err); return res.status(500).json({message : 'Internal error occured while trying to send OTP code'})}
}

exports.validateOTPNumber = async (req , res , next) => {
	
	const {OTP} = req.body;

		// checking if the OTP token is expired or not
	const verifyOTP = await speakeasy.totp.verify({
		secret : process.env.SPEAKEASY_SECRET,
		token : OTP,
		encoding: 'base32',
		digits : 5,
		window: 10
	});
	
	if(verifyOTP) {
		req.session.isOTPAuthenticated = true;
		return res.status(200).json({message : "OTP validation success !"});	
	}
	
	else {
		console.log(verifyOTP);
		return res.status(500).json({message : "OTP validation failed !"});
	}
}


exports.resetPassword = async (req, res) => {
	const client = await pool.connect();
	try {
		
		const {email , newPassword} = req.body;
		const hashedPassword = await bcrypt.hash(newPassword , 12);
		
		if(!req.session.isOTPAuthenticated){
			return res.status(400).json({message : 'Terjadi Kesalahan dalam proses reset password'});
		}
		
		await client.query('BEGIN');
		
		const {rows} =  await client.query('SELECT email_address FROM users WHERE email_address = $1' , [email]);
			
		if (rows.length > 0){
			await client.query('UPDATE users SET password = $1 WHERE email_address = $2' , [ hashedPassword , rows[0].email_address]);
			await client.query('COMMIT');
			req.session.isOTPAuthenticated = false;
			return res.status(201).json({message : 'Reset password berhasil dilakukan , silahkan login ulang !'});
		}
			
		else{
			await client.query('ROLLBACK');
			return res.status(404).json({message : 'Akun tidak ditemukan.'});
		}
		
	}
	
	catch(e){
		await client.query('ROLLBACK');
		return res.status(500).json({message : 'Terjadi Kesalahan dalam proses reset password'});
		
	}
	
	finally{
		client.release();
	}
		
}