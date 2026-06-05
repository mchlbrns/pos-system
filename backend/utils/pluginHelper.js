const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function getPluginConfig(businessType) {
  try {
    const pluginPath = path.resolve(__dirname, '../plugins', `${businessType}.json`);
    if (fs.existsSync(pluginPath)) {
      const data = fs.readFileSync(pluginPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    logger.error(`Failed to load plugin config for ${businessType}`, err);
  }
  return {
    unitOfMeasure: 'pc',
    fields: [],
    printTemplate: ''
  };
}

module.exports = { getPluginConfig };
