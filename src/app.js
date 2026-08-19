//create server
//config server 
//|
//v
//  types of APIS and middlewares

const express =require("express")
const cookieParser=require("cookie-parser")


const app=express()


//MIDDLEWARE to read data of req.body
app.use(express.json())
app.use(cookieParser())


/**
 * -Routes required
 */
const authRouter=require("./routes/auth.routes")
const accountRouter=require("./routes/account.routes")
const transactionRoutes=require("./routes/transaction.routes")





/**
 * -Use Routes
 */
app.use("/api/auth",authRouter)
app.use("/api/accounts",accountRouter)
app.use("/api/transactions",transactionRoutes)





module.exports=app
