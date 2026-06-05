const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../database/init');
const pluginLoader = require('../services/PluginLoader');

router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const plugins = db.prepare('SELECT * FROM plugins').all();
    res.json(plugins.map(p => {
      p.config = JSON.parse(p.config || '{}');
      return p;
    }));
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
    
    // Reload plugins
    pluginLoader.initialize();
    
    res.json({ message: `Plugin ${name} updated successfully`, is_active: !!is_active });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
