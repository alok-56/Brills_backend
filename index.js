const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongosanatize = require("express-mongo-sanitize");
const DatabaseConnection = require("./Config/Database");
const globalErrHandler = require("./Middleware/globalerror");
const Hotelroutes = require("./Routes/HotelRoutes");
const Adminroutes = require("./Routes/AdminRoutes");
const Roomroutes = require("./Routes/RoomRoutes");
const BookingRoutes = require("./Routes/BookingRoutes");
const MenuRoutes = require("./Routes/MenuRoutes");
const FileRouter = require("./Routes/FileUpload");
const ReportRoutes = require("./Routes/ReportRoutes");
const ExpenseRoutes = require("./Routes/expence");
const UserwebRoutes = require("./Routes/userRoutes");
const publicrouter = require("./Routes/Public");
require("dotenv").config();
DatabaseConnection();
const app = express();

// Global Middileware
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(mongosanatize());

// Route Middleware
app.use("/api/v1/admin", Adminroutes);
app.use("/api/v1/hotel", Hotelroutes);
app.use("/api/v1/room", Roomroutes);
app.use("/api/v1/booking", BookingRoutes);
app.use("/api/v1/menu", MenuRoutes);
app.use("/api/v1/file", FileRouter);
app.use("/api/v1/report", ReportRoutes);
app.use("/api/v1/expenses", ExpenseRoutes);
app.use("/api/v1/web", UserwebRoutes);
app.use("/api/v1/public", publicrouter);

// Not Found Route
app.use("*", (req, res, next) => {
  return res.status(404).json({
    status: false,
    code: 404,
    message: "Route Not Found",
  });
});

// Global Error Middleware
app.use(globalErrHandler);

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`App is listening at Port ${PORT}`);
});
