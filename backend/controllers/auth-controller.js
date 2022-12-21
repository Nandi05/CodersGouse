const otpService=require('../services/otp-service');
const HashService=require('../services/hash-service');
const hashService = require('../services/hash-service');
const userService = require('../services/user-service');
const tokenService = require('../services/token-service');
const Mongoose =require("mongoose");
const { createIndexes } = require('../models/user-model');

class AuthController{
    async sendOtp(req,res){
        //logic to send otp
        const {phone}=req.body;
        if(!phone){
            res.status(400).json({message: "Phone field is required!"});
        }
        const otp=await otpService.generateOtp();
        //hashing otp
        const ttl = 1000 * 60 * 2; // 2 min
        const expires = Date.now() + ttl;
        const data = `${phone}.${otp}.${expires}`;
        const hash = hashService.hashOtp(data);
        
        //send otp by sms
        try{
            // await otpService.sendBySms(phone,otp);
            return res.json({
                hash:`${hash}.${expires}`,
                phone,
                otp,
            })
        }catch(err){
            console.log(err);
            res.status(500).json({message: "Otp sending failed!"});
        }

        
    }
    async verifyOtp(req,res){
        //logic
        const{otp,hash,phone}=req.body;
        if(!otp || !hash || !phone){
            res.status(400).json({message:"All fields are required!"});
        }
        const[hashedOtp,expires]=hash.split('.');
        if(Date.now()> +expires){
            res.status(400).json({message:'OTP has expired!'})
        }
        const data=`${phone}.${otp}.${expires}`;

        const isValid=otpService.verifyOtp(hashedOtp,data);
        if(!isValid){
            res.status(400).json({message:"Invalid OTP."});
        }
        let user;
        try{
            user=await userService.findUser({phone: phone});
            if(!user){
                await userService.createUser({phone: phone});
                console.log("user created",user);
            }
            console.log(user);
        }catch(err){
                console.log(err);
                res.status(500).json({message:"DATABASE ERROR"});
        }
        
        
        //token generation
        const {accessToken,refreshToken}=tokenService.generateTokens({_id: Mongoose.objectId(user._id),activated: false});
        res.cookie('refreshtoken',refreshToken,{
            maxAge: 1000*60*60*24*30,
            httpOnly: true,
        });
        res.json({accessToken});

    }

}
module.exports=new AuthController();