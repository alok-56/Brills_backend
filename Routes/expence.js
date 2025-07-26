const express = require("express");
const Islogin = require("../Middleware/Islogin");
const {
  CreateExpense,
  GetAllExpenses,
  GetExpenseById,
  UpdateExpense,
  DeleteExpense,
  GetExpenseStatistics,
  GetExpensesByDateRange,
  UpdateExpenseStatus,
  Hotelwisecash,
} = require("../Controller/Expense");

const ExpenseRoutes = express.Router();

ExpenseRoutes.get("/cash", Islogin, Hotelwisecash);
ExpenseRoutes.post("/create", Islogin, CreateExpense);
ExpenseRoutes.get("/all", Islogin, GetAllExpenses);
ExpenseRoutes.get("/:id", Islogin, GetExpenseById);
ExpenseRoutes.patch("/update/:id", Islogin, UpdateExpense);
ExpenseRoutes.delete("/:id", Islogin, DeleteExpense);
ExpenseRoutes.get("/statistics/overview", Islogin, GetExpenseStatistics);
ExpenseRoutes.get("/range", Islogin, GetExpensesByDateRange);
ExpenseRoutes.patch("/status/:id", Islogin, UpdateExpenseStatus);

module.exports = ExpenseRoutes;
