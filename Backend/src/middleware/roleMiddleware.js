const allowRole = (role) => {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ message: 'Access denied' });
    // Treat null/undefined role as "requester" (legacy users before role column)
    const effectiveRole = req.user.role || 'requester';
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(effectiveRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

module.exports = allowRole;
