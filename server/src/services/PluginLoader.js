/**
 * @module services/PluginLoader
 * @description Registers dynamic hooks for water stations, laundries, and motor repairs.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/init');

class PluginLoader {
  constructor() {
    this.hooks = {
      beforeProductCreate: [],
      beforeProductUpdate: [],
      beforeCheckout: [],
      afterCheckout: []
    };
  }

  initialize() {
    this.hooks = {
      beforeProductCreate: [],
      beforeProductUpdate: [],
      beforeCheckout: [],
      afterCheckout: []
    };

    console.log('Initializing business logic plugins...');
    const db = getDatabase();

    const count = db.prepare('SELECT COUNT(*) as count FROM plugins').get().count;
    if (count === 0) {
      db.prepare('INSERT INTO plugins (name, type, version, is_active) VALUES (?, ?, ?, ?)').run('waterstation', 'business_type', '1.0.0', 1);
      db.prepare('INSERT INTO plugins (name, type, version, is_active) VALUES (?, ?, ?, ?)').run('laundry', 'business_type', '1.0.0', 1);
      db.prepare('INSERT INTO plugins (name, type, version, is_active) VALUES (?, ?, ?, ?)').run('motorepair', 'business_type', '1.0.0', 1);
    }

    const activePlugins = db.prepare('SELECT name FROM plugins WHERE is_active = 1').all();

    activePlugins.forEach(p => {
      const pluginDir = path.resolve(__dirname, '../../plugins', p.name);
      const indexPath = path.join(pluginDir, 'index.js');
      
      if (fs.existsSync(indexPath)) {
        try {
          const plugin = require(indexPath);
          if (plugin.hooks) {
            for (const [hookName, handler] of Object.entries(plugin.hooks)) {
              if (this.hooks[hookName]) {
                this.hooks[hookName].push({
                  pluginName: p.name,
                  handler
                });
                console.log(`Registered hook [${hookName}] from plugin [${p.name}]`);
              }
            }
          }
        } catch (err) {
          console.error(`Failed to load plugin ${p.name}:`, err);
        }
      }
    });
  }

  triggerHook(hookName, context, businessId) {
    if (!this.hooks[hookName] || this.hooks[hookName].length === 0) {
      return context;
    }

    let currentContext = { ...context };
    const db = getDatabase();
    
    const biz = db.prepare('SELECT type FROM businesses WHERE id = ?').get(businessId);
    if (!biz) return context;

    for (const hook of this.hooks[hookName]) {
      if (hook.pluginName === biz.type) {
        try {
          currentContext = hook.handler(currentContext, { db, businessId });
        } catch (err) {
          console.error(`Error running hook ${hookName} in plugin ${hook.pluginName}:`, err);
        }
      }
    }

    return currentContext;
  }
}

module.exports = new PluginLoader();
