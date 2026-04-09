const express = require("express");
const router = express.Router();

const verifyToken = require("../../middleware/authMiddleware");
const allowRole = require("../../middleware/roleMiddleware");
const { listUsers, createUser } = require("./users.controller");

router.get("/", verifyToken, allowRole(["oic", "approver", "supervisor"]), listUsers);
router.post("/", verifyToken, allowRole(["oic", "approver"]), createUser);

module.exports = router;
