//BEFORE CREATING ACCOUNT THIS MIDDLEWARE CHECKS FOR USER TO BE AUTHENTICATED
const userModel =require("../models/user.model")
const jwt =require("jsonwebtoken")





async function authMiddleware(req,res,next){
    console.log("COOKIES:", req.cookies);
    console.log("AUTH HEADER:", req.headers.authorization);

    const token=req.cookies.token||req.headers.authorization?.split(" ")[1]
     console.log("TOKEN:", token);
    if(!token){
        return res.status(401).json({
            message:"Unauthorized access,token is missing"
        })
    }

    //verify token
    try{
      const decoded =jwt.verify (token,process.env.JWT_SECRET)

      //we used only user id while creating token
      //userid will be saved in decoded

      const user=await userModel.findById(decoded.userId)
      req.user=user
      return next()

    }catch(err){
        return res.status(401).json({
            message:"Unauthorized access,token is invalid"
        })

    }
}

async function authSystemUserMiddleware(req,res,next){
const token=req.cookies.token || req.headers.authorization?.split(" ")[1]

if(!token){
    return res.status(401).json({
        message:"Unauthorized access,token is missing"
    })
}
try{
    const decoded=jwt.verify(token,process.env.JWT_SECRET)

    const user= await userModel.findById(decoded.userId).select("+systemUser")
    if(!user.systemUser){
        return res.status(403).json({
            message:"forbidden access, not a system user"
        })
    }
    req.user= user
    return next()
}
catch(err){
    return res.status(401).json({
        message:"Unauthorized access, token is invalid"
    })
}
}
module.exports= 
   {

    authMiddleware,
    authSystemUserMiddleware

   }
