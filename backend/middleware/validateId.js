const mongoose = require('mongoose');

// Express middleware factory: validates that req.params[paramName] is a
// well-formed MongoDB ObjectId before the route handler runs a query with
// it. Without this, a malformed id (typo'd URL, stale bookmark, etc.) makes
// Mongoose throw a CastError deep inside findById/findOne, which the routes'
// generic catch blocks turn into an unhelpful "500 Internal Server Error" —
// this catches it earlier with a clear, correct 400 instead.
function validateId(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({ error: `Invalid ${paramName}: "${value}" is not a valid id` });
    }
    next();
  };
}

module.exports = validateId;
