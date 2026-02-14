const productService = require('../services/productService');

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products); // Returns array matching Dexie structure
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

// ✅ NEW: Update Product Controller
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

// ✅ NEW: Delete Product Controller
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await productService.deleteProduct(id);

    if (!success) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, addProduct, updateProduct, deleteProduct };