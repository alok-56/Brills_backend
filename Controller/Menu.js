const MenuModel = require("../Model/Menu");
const AppErr = require("../Helper/AppError");

// Create Menu
const createMenu = async (req, res, next) => {
  try {
    const { hotelId, menuname, price, isavailable = true, Category } = req.body;

    if (!hotelId || !menuname || price == null) {
      return next(new AppErr("hotelId, menuname, and price are required", 400));
    }

    const newMenu = await MenuModel.create({
      hotelId,
      menuname,
      price,
      isavailable,
      Category,
    });

    res.status(201).json({
      status: true,
      message: "Menu created successfully",
      data: newMenu,
    });
  } catch (error) {
    next(new AppErr(error.message, 500));
  }
};


// Update Menu
const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { menuname, price, isavailable, Category } = req.body;

    const menu = await MenuModel.findById(id);
    if (!menu) return next(new AppErr("Menu not found", 404));

    if (menuname !== undefined) menu.menuname = menuname;
    if (price !== undefined) menu.price = price;
    if (isavailable !== undefined) menu.isavailable = isavailable;
    if (Category !== undefined) menu.Category = Category;

    await menu.save();

    res.status(200).json({
      status: true,
      message: "Menu updated successfully",
      data: menu,
    });
  } catch (error) {
    next(new AppErr(error.message, 500));
  }
};


// Get All Menus
const getAllMenus = async (req, res, next) => {
  try {
    const hotelIds = req.branch; // array of ObjectIds

    const filter = {
      hotelId: { $in: hotelIds },
    };

    const menus = await MenuModel.find(filter).populate("hotelId");

    res.status(200).json({
      status: true,
      message: "Menus fetched successfully",
      data: menus,
    });
  } catch (error) {
    next(new AppErr(error.message, 500));
  }
};

// Delete Menu
const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menu = await MenuModel.findByIdAndDelete(id);
    if (!menu) return next(new AppErr("Menu not found", 404));

    res.status(200).json({
      status: true,
      message: "Menu deleted successfully",
    });
  } catch (error) {
    next(new AppErr(error.message, 500));
  }
};

module.exports = {
  createMenu,
  updateMenu,
  getAllMenus,
  deleteMenu,
};
