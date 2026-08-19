const mongoose= require("mongoose")
const bcrypt=require("bcryptjs")
const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:[true,"Email is required to create a user account"],
        trim:true,
        lowercase:true,
        //EMAIL REGEX FOR MONGOOSE SCHEMA
        match:[/^[^\s@]+@[^\s@]+\.[^\s@]+$/,"Invalid email address"],
        unique:[true,"Email already exists"]

    },
    name:{
        type:String,
        required:[true,"Name is required to create a user account"]
    },
    password:{
        type:String,
        required:[true,"Password is required for creating a user account"],
        minLength:[6,"Password should be atleast 6 characters long"],
        //SECURITY MEASURE ->PASSWORD WILL NOT OCCUR IN RESPONSE OF ANY QUERY BY DEFAULT
        select:false
    }
 ,
 systemUser:{
    type:Boolean,
    default:false,
    immutable:true,
    select:false
}

 },
 {
        timestamps:true
    
})
userSchema.pre("save",async function(next){
    //IF PASSWORD IS NOT MODIFIED/CHANGED OR UPDATED  RETURN NEXT NO NEED TO HASH AGAIN
if(!this.isModified("password")){
    return
}
    //IF PASSWORD IS  MODIFIED/CHANGED OR UPDATED  HASH USING BCRYPTJS
const hash= await bcrypt.hash(this.password,10)
this.password=hash
return 
})
userSchema.methods.comparePassword =async function(password){
    return await bcrypt.compare(password,this.password)
}
const userModel=mongoose.model("user",userSchema)


module.exports= userModel