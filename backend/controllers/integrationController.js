const integrationService = require('../services/integrationService');

const getIntegrations = async (req, res, next) => {
  try {
    const config = await integrationService.getSettings();
    res.json(config);
  } catch (error) {
    next(error);
  }
};

const updateIntegrations = async (req, res, next) => {
  try {
    const updatedConfig = await integrationService.updateSettings(req.body);
    res.json(updatedConfig);
  } catch (error) {
    next(error);
  }
};

module.exports = { getIntegrations, updateIntegrations };