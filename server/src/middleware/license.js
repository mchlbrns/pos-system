const fs = require('fs');
const path = require('path');

module.exports = function(req, res, next) {
  // Bypassed endpoints (e.g. login, system diagnostics)
  if (req.path === '/api/auth/login' || req.path === '/' || req.path === '/api/settings/license') {
    return next();
  }

  const licenseFile = path.resolve(__dirname, '../../data/license.json');
  let isValid = false;

  if (fs.existsSync(licenseFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(licenseFile, 'utf8'));
      if (data.key && data.status === 'active') {
        isValid = true;
      }
    } catch (err) {
      // Invalid JSON
    }
  }

  // For development or trial purposes, we allow a 30-day grace period if key is missing
  if (!isValid) {
    // If no license config, check if we want to bypass or enforce.
    // For this POC, we allow execution but log a warning, or enforce if in production.
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'License key invalid or expired. Please enter a valid license key in Settings.' });
    }
  }

  next();
};
