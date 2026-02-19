const productService = require('../services/productService');

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    // ✅ Returns array matching the structure expected by your frontend Dexie/State logic
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const addProduct = async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.price) {
      return res.status(400).json({ message: 'Name and Price are required' });
    }
    const newProduct = await productService.createProduct(req.body);
    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
};

// ✅ Update Product: Handles PUT requests from frontend/src/services/productService.ts
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await productService.updateProduct(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ✅ Delete Product: Handles DELETE requests
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await productService.deleteProduct(id);

    // If the service returns success: false, send 404
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    // Return the success message (e.g., "Deleted" or "Archived")
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Report Damage Controller
const reportDamage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { qty, reason } = req.body;

    if (!qty || qty <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    const updatedProduct = await productService.reportDamage(id, qty, reason);

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Get Damage Logs Controller
const getDamageLogs = async (req, res, next) => {
  try {
    const logs = await productService.getDamageLogs();
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// --- CATEGORY CONTROLLERS ---

const getCategories = async (req, res, next) => {
    try { res.json(await productService.getCategories()); } catch (error) { next(error); }
};

const addCategory = async (req, res, next) => {
    try {
        if (!req.body.name) return res.status(400).json({ error: "Category name is required" });
        res.status(201).json(await productService.addCategory(req.body.name));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteCategory = async (req, res, next) => {
    try { res.json(await productService.deleteCategory(req.params.id)); } catch (error) { next(error); }
};

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  reportDamage,
  getDamageLogs,
  getCategories, // ✅ New
  addCategory,   // ✅ New
  deleteCategory // ✅ New
};