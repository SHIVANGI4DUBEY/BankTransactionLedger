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

async function getUserAccountsController(req,res){
    const accounts=await accountModel.find({user:req.user._id})
    res.status(200).json({
        accounts
    })
}

async function getAccountBalance(req,res){
    const{accountId} =req.params;
    //to check the account belongs to same user to maintain privacy
    const account=await accountModel.findOne({
        _id:accountId,
        user:req.user._id
    })
    if(!account){
        return res.status(404).json({
            message:"Account not found"
        })
    }
    const balance=await account.getBalance();
    res.status(200).json({
        accountId: account._id,
        balance:balance
    })
}
module.exports={
    createAccount,
    getUserAccountsController,
    getAccountBalance
}