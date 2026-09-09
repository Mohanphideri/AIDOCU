const express = require('express');

/**
 * Returns a router that responds 501 for any method/path, with a clear
 * message pointing to the service contract that still needs wiring up.
 * Used for API modules whose service layer is currently a documented stub
 * (questions, papers, translations) so the route structure from spec
 * section 80 exists end-to-end even before full logic lands.
 */
function notImplementedRouter(moduleName) {
  const router = express.Router();
  router.all('*', (req, res) => {
    res.status(501).json({
      success: false,
      message: `${moduleName} endpoints are scaffolded but not yet implemented. See services/${moduleName}Service.js.`,
      code: 'NOT_IMPLEMENTED',
    });
  });
  return router;
}

module.exports = notImplementedRouter;
