const jwt = require('jsonwebtoken');

// 1. Protect routes (Check for a valid token)
const protect = (req, res, next) => {
  let token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    // Remove 'Bearer ' prefix if the frontend sends it that way
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trimLeft();
    }

    // Verify the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user info (id, role) to the request object
    req.user = decoded;

    // Let them pass to the route!
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// 2. Authorize roles (Check for correct permissions)
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied: You do not have permission to do this'
      });
    }
    next(); // Let them pass!
  };
};

module.exports = { protect, authorizeRoles };