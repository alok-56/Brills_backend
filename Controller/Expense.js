const { validationResult } = require("express-validator");

const mongoose = require("mongoose");
const ExpenseModel = require("../Model/Expense");
const AppErr = require("../Helper/AppError");
const Cashmodel = require("../Model/Cash");
const HotelModel = require("../Model/Hotel");

// CREATE - Add new expense
const CreateExpense = async (req, res, next) => {
  try {
    let err = validationResult(req);
    if (err.errors.length > 0) {
      return next(new AppErr(err.errors[0].msg, 403));
    }

    let {
      expenseName,
      hotelId,
      category,
      amount,
      paymentMethod,
      expenseDate,
      month,
      year,
      notes,
      attachmentUrl,
      status,
    } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return next(new AppErr("Invalid hotelId format", 400));
    }

    let expense = await ExpenseModel.create(req.body);

    if (paymentMethod === "Cash") {
      let res = await Cashmodel.create({
        hotelId: hotelId,
        amount: amount,
        type: "expense",
        remarks: `While adding expence ${expenseName}`,
      });
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Expense Created Successfully",
      data: expense,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// READ - Get all expenses with filtering and pagination
const GetAllExpenses = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      hotelId,
      category,
      paymentMethod,
      status,
      month,
      year,
      startDate,
      endDate,
      sortBy = "expenseDate",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    if (hotelId) {
      if (!mongoose.Types.ObjectId.isValid(hotelId)) {
        return next(new AppErr("Invalid hotelId format", 400));
      }
      filter.hotelId = hotelId;
    }

    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (status) filter.status = status;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    // Date range filter
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    let expenses = await ExpenseModel.find(filter)
      .populate("hotelId", "name")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    let totalExpenses = await ExpenseModel.countDocuments(filter);
    let totalPages = Math.ceil(totalExpenses / parseInt(limit));

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Expenses Retrieved Successfully",
      data: expenses,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalExpenses,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// READ - Get single expense by ID
const GetExpenseById = async (req, res, next) => {
  try {
    let { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppErr("Invalid expense ID format", 400));
    }

    let expense = await ExpenseModel.findById(id).populate("hotelId", "name");

    if (!expense) {
      return next(new AppErr("Expense not found", 404));
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Expense Retrieved Successfully",
      data: expense,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// UPDATE - Update expense by ID
const UpdateExpense = async (req, res, next) => {
  try {
    let err = validationResult(req);
    if (err.errors.length > 0) {
      return next(new AppErr(err.errors[0].msg, 403));
    }

    let { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppErr("Invalid expense ID format", 400));
    }

    // Validate hotelId if provided
    if (
      req.body.hotelId &&
      !mongoose.Types.ObjectId.isValid(req.body.hotelId)
    ) {
      return next(new AppErr("Invalid hotelId format", 400));
    }

    let updatedExpense = await ExpenseModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("hotelId", "name");

    if (!updatedExpense) {
      return next(new AppErr("Expense not found", 404));
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Expense Updated Successfully",
      data: updatedExpense,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// DELETE - Delete expense by ID
const DeleteExpense = async (req, res, next) => {
  try {
    let { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppErr("Invalid expense ID format", 400));
    }

    let deletedExpense = await ExpenseModel.findByIdAndDelete(id);

    if (!deletedExpense) {
      return next(new AppErr("Expense not found", 404));
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Expense Deleted Successfully",
      data: deletedExpense,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// GET EXPENSE STATISTICS
const GetExpenseStatistics = async (req, res, next) => {
  try {
    let { hotelId, month, year } = req.query;

    const matchFilter = {};
    if (hotelId) {
      if (!mongoose.Types.ObjectId.isValid(hotelId)) {
        return next(new AppErr("Invalid hotelId format", 400));
      }
      matchFilter.hotelId = new mongoose.Types.ObjectId(hotelId);
    }
    if (month) matchFilter.month = parseInt(month);
    if (year) matchFilter.year = parseInt(year);

    let stats = await ExpenseModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalExpenses: { $sum: 1 },
          averageAmount: { $avg: "$amount" },
          maxAmount: { $max: "$amount" },
          minAmount: { $min: "$amount" },
        },
      },
    ]);

    // Category-wise breakdown
    let categoryStats = await ExpenseModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Payment method breakdown
    let paymentMethodStats = await ExpenseModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Expense Statistics Retrieved Successfully",
      data: {
        summary: stats[0] || {
          totalAmount: 0,
          totalExpenses: 0,
          averageAmount: 0,
          maxAmount: 0,
          minAmount: 0,
        },
        categoryBreakdown: categoryStats,
        paymentMethodBreakdown: paymentMethodStats,
      },
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// GET EXPENSES BY DATE RANGE
const GetExpensesByDateRange = async (req, res, next) => {
  try {
    let { startDate, endDate, hotelId } = req.query;

    if (!startDate || !endDate) {
      return next(new AppErr("Start date and end date are required", 400));
    }

    const filter = {
      expenseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    if (hotelId) {
      if (!mongoose.Types.ObjectId.isValid(hotelId)) {
        return next(new AppErr("Invalid hotelId format", 400));
      }
      filter.hotelId = hotelId;
    }

    let expenses = await ExpenseModel.find(filter)
      .populate("hotelId", "name")
      .sort({ expenseDate: -1 });

    let totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Expenses Retrieved Successfully",
      data: {
        expenses,
        totalAmount,
        totalCount: expenses.length,
      },
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// UPDATE EXPENSE STATUS
const UpdateExpenseStatus = async (req, res, next) => {
  try {
    let err = validationResult(req);
    if (err.errors.length > 0) {
      return next(new AppErr(err.errors[0].msg, 403));
    }

    let { id } = req.params;
    let { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppErr("Invalid expense ID format", 400));
    }

    let updatedExpense = await ExpenseModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate("hotelId", "name");

    if (!updatedExpense) {
      return next(new AppErr("Expense not found", 404));
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message: "Expense Status Updated Successfully",
      data: updatedExpense,
    });
  } catch (error) {
    return next(new AppErr(error.message, 500));
  }
};

// current cash
const Hotelwisecash = async (req, res, next) => {
  try {
    // Get all hotels
    const hotels = await HotelModel.find();

    // Get all cash entries
    const cashEntries = await Cashmodel.find().sort({ createdAt: -1 });

    // Group cash entries by hotelId
    const cashMap = {};

    for (const entry of cashEntries) {
      const hotelId = entry.hotelId.toString();

      if (!cashMap[hotelId]) {
        cashMap[hotelId] = {
          bookingCash: 0,
          expenseCash: 0,
          cashDetails: [],
        };
      }

      if (entry.type === "booking") {
        cashMap[hotelId].bookingCash += entry.amount;
      } else if (entry.type === "expense") {
        cashMap[hotelId].expenseCash += entry.amount;
      }

      // Push details for every entry
      cashMap[hotelId].cashDetails.push({
        _id: entry._id,
        type: entry.type,
        amount: entry.amount,
        remarks: entry.remarks,
        createdAt: entry.createdAt,
      });
    }

    // Prepare final response
    const response = hotels.map((hotel) => {
      const hotelId = hotel._id.toString();
      const cash = cashMap[hotelId] || {
        bookingCash: 0,
        expenseCash: 0,
        cashDetails: [],
      };

      return {
        hotelId: hotel._id,
        hotelName: hotel.hotelName,
        bookingCash: cash.bookingCash,
        expenseCash: cash.expenseCash,
        availableCash: cash.bookingCash - cash.expenseCash,
        cashDetails: cash.cashDetails,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Hotel-wise cash summary with details",
      data: response,
    });
  } catch (error) {
    console.error("Hotelwisecash error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  CreateExpense,
  GetAllExpenses,
  GetExpenseById,
  UpdateExpense,
  DeleteExpense,
  GetExpenseStatistics,
  GetExpensesByDateRange,
  UpdateExpenseStatus,
  Hotelwisecash,
};
