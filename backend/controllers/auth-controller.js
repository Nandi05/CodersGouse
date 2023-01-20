const otpService=require('../services/otp-service');
const HashService=require('../services/hash-service');
const hashService = require('../services/hash-service');
const userService = require('../services/user-service');
const tokenService = require('../services/token-service');
const Mongoose =require("mongoose");
const { createIndexes } = require('../models/user-model');

const UserDto = require('../dtos/user-dto');

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
                user=await userService.createUser({phone: phone});
                console.log("user created",user);
            }
            console.log(user);
        }catch(err){
                console.log(err);
                res.status(500).json({message:"DATABASE ERROR"});
        }
        
        
        //token generation
        const {accessToken,refreshToken}=tokenService.generateTokens({_id:user._id,activated: false});
        //to store the token in another table in database
        await tokenService.storeRefreshToken(refreshToken,user._id);
        res.cookie('refreshtoken',refreshToken,{
            maxAge: 1000*60*60*24*30,
            httpOnly: true,
        });
        res.cookie('accesstoken',accessToken,{
            maxAge: 1000*60*60*24*30,
            httpOnly: true,
        });


        const userDto=new UserDto(user);
        res.json({user: userDto,auth:true});

    }
    async refresh(req,res){
        //get refreshtoken from cookie
        const {refreshtoken: refreshtokenFromCookie}=req.cookies;
        //check if the token is valid or not
        let userData;
        try{
            userData=await tokenService.verifyRefreshToken(refreshtokenFromCookie);
        }catch(err){
            return res.status(401).json({message:"Invalid Token!"});
        }
        //whether the token is in database or not
        try{
        const token= await tokenService.findRefreshToken(userData._id,refreshtokenFromCookie);
        if(!token){
            return res.status(401).json({message:"Invalid Token!"});
        }
        }catch(err){
            return res.status(500).json({message:"Internal error"});
        }
        //check if valid user
        const user=await userService.findUser({_id: userData._id});
        if(!user){
            return res.status(404).json({message:"No user"});
        }
       //generate a new token
        const {refreshToken,accessToken}=tokenService.generateTokens({_id:userData._id,activated: false});
        //update refresh token in db
        try{
            await tokenService.updateRefreshToken(userData._id,refreshToken);
            console.log("token updatedd!");
        }catch(err){
            return res.status(500).json({message:"Internal error"});
        }
        //put it in cookie
        res.cookie('refreshtoken',refreshToken,{
            maxAge: 1000*60*60*24*30,
            httpOnly: true,
        });
        res.cookie('accesstoken',accessToken,{
            maxAge: 1000*60*60*24*30,
            httpOnly: true,
        });
        console.log("added in cookie");


        //send response to the user
        const userDto=new UserDto(user);
        res.json({user: userDto,auth:true});

    }
    //logout function
    async logout(req,res){
        const {refreshtoken}=req.cookies;
        //delete refresh token from database
        await tokenService.removeToken(refreshtoken);
        //delete cookies
        res.clearCookie('refreshtoken');
        res.clearCookie('accesstoken');
        res.json({user: null, auth: false});
    }

}
module.exports=new AuthController();