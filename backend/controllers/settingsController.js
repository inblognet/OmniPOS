const settingsService = require('../services/settingsService');

const getSettings = async (req, res, next) => {
  try { res.json(await settingsService.getSettings()); } catch (error) { next(error); }
};

const updateSettings = async (req, res, next) => {
  try { res.json(await settingsService.updateSettings(req.body)); } catch (error) { next(error); }
};

const exportData = async (req, res, next) => {
    try { res.json(await settingsService.exportDatabase()); } catch (error) { next(error); }
};

// ✅ NEW: Added controller to handle the restore payload
const restoreData = async (req, res, next) => {
    try { res.json(await settingsService.restoreDatabase(req.body)); } catch (error) { next(error); }
};

const clearSalesData = async (req, res, next) => {
    try { res.json(await settingsService.clearSales()); } catch (error) { next(error); }
};

const clearInventoryData = async (req, res, next) => {
    try { res.json(await settingsService.clearInventory()); } catch (error) { next(error); }
};

const executeFactoryReset = async (req, res, next) => {
    try { res.json(await settingsService.factoryReset()); } catch (error) { next(error); }
};

module.exports = {
    getSettings, updateSettings,
    exportData, restoreData, clearSalesData, clearInventoryData, executeFactoryReset
};