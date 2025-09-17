const mongoose = require("mongoose");

const StatusLogsSchema = new mongoose.Schema(
  {
    bookingid: {
      type: String,
      required: true,
    },
    logtype: {
      type: String,
      required: true,
    },
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

const StatusLogsmodel = mongoose.model("Statuslog", StatusLogsSchema);
module.exports = StatusLogsmodel;
