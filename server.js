require("dotenv").config()

//start server
const app= require("./src/app")
const connectToDB=require("./src/config/db")


connectToDB()


app.listen(3000,()=>{
    console.log("Server is running on port 3000")
})
