const mongoose = require("mongoose")


const accountSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:[true,"Account must be associated with a user"],
        //Single user can hold multiple accounts 
        //to make searching fast we use index in mongodb on user
        //It uses B+ tree data Structure
        index:true
    },
    status:{
        type:String,
        enum:{
          values:  ["Active","Frozen","Closed"],
          message:"Status can be Active, Frozen or Closed",
          

    },
    default:"Active"
},
currency:{
    type:String,
    required:[true,"Currency is required for creating an account"],
    default:"INR"
}

//balance is not hardcoded it can be cached but never stored in db 
//for bal we use ledger
},{
    timestamps: true

})
//compound index
//MongoDB, make a shortcut so you can quickly find accounts based on user and status."
accountSchema.index({user:1,status:1})

const accountModel=mongoose.model("account",accountSchema)
module.exports= accountModel