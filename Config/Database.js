const mongoose = require("mongoose");

require('dotenv').config()

const DatabaseConnection = async () => {
  mongoose
    .connect(process.env.DATABASEURL)
    .then(async(res) => {
      
      console.log("Database Connected Successfully");
    })
    .catch((err) => {
      console.log("Failed To Connect the Database");
    });
};

module.exports=DatabaseConnection
