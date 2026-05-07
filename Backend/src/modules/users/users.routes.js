const express = require("express");
const router = express.Router();

const verifyToken = require("../../middleware/authMiddleware");
const allowRole = require("../../middleware/roleMiddleware");
const { listUsers, createUser, deleteUser } = require("./users.controller");

router.get("/", verifyToken, allowRole(["oic", "approver", "supervisor"]), listUsers);
router.post("/", verifyToken, allowRole(["oic", "approver"]), createUser);

router.delete(
  "/:id",
  verifyToken,
  allowRole(["oic", "approver", "supervisor"]),
  deleteUser
);

module.exports = router;
