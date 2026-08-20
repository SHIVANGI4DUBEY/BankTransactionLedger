const express=require("express")
const {authMiddleware}=require("../middleware/auth.middleware")
const accountController=require("../controller/account.controller")

const router =express.Router();

/**
 * -POST /api/accounts
 * -Create a new account
 * -Protected route-needs token
 */

router.post("/",authMiddleware,accountController.createAccount)




module.exports=router