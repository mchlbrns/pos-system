const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../database/init');
const { getPluginConfig } = require('../utils/pluginHelper');

router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const plugins = db.prepare('SELECT * FROM plugins').all();
    res.json({
      success: true,
      data: plugins.map(p => {
        p.config = JSON.parse(p.config || '{}');
        // Merge in details from the JSON files
        const jsonConfig = getPluginConfig(p.name);
        return {
          ...p,
          ...jsonConfig
        };
      })
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:name/toggle', (req, res, next) => {
  try {
    const { name } = req.params;
    const { is_active } = req.body;
    const db = getDatabase();
    
    db.prepare('UPDATE plugins SET is_active = ?, updated_at = datetime(\'now\') WHERE name = ?')
      .run(is_active ? 1 : 0, name);
    
    res.json({
      success: true,
      data: {
        message: `Plugin ${name} updated successfully`,
        is_active: !!is_active
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
