const mongoose = require("mongoose");


const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected with database")
    } catch (error) {
    console.log("Database connection error:", error.message);
    process.exit(1);
    }
}


module.exports = connectDatabase