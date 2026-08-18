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

app.get("/", (req, res) => {
    console.log("🔥 ROOT REQUEST REACHED")
    res.send("Server is working")
})

/**
 * -Use Routes
 */
app.use("/api/auth",authRouter)
app.use("/api/accounts",accountRouter)





module.exports=app
