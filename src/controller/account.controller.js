const accountModel =require("../models/account.model")

async function createAccount(req,res){
    //create account
    const user=req.user;
    const account=await accountModel.create({
        user: user._id
    })

//account send in response
res.status(201).json({
    account
})
}
module.exports={
    createAccount
}