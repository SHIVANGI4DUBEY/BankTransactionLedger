const {Router}=require("express")
const authMiddleware=require("../middleware/auth.middleware");
const transactionController =require("../controller/transaction.controller")

const transactionRoutes=Router();

/**
 * -POST/api/transactions/
 * -Create a new transaction
 */
transactionRoutes.post("/",authMiddleware,transactionController.createTransaction)

module.exports=transactionRoutes;