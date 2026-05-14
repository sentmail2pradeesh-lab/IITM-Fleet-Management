const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authMiddleware");
const allowRole = require("../../middleware/roleMiddleware");
const asyncHandler = require("../../middleware/asyncHandler");
const {
  listActive,
  listManage,
  createLocation,
  updateLocation,
  deleteLocation
} = require("./location.controller");

router.get("/", verifyToken, asyncHandler(listActive));
router.get("/manage", verifyToken, allowRole(["oic", "approver"]), asyncHandler(listManage));
router.post("/", verifyToken, allowRole(["oic", "approver"]), asyncHandler(createLocation));
router.patch("/:id", verifyToken, allowRole(["oic", "approver"]), asyncHandler(updateLocation));
router.delete("/:id", verifyToken, allowRole(["oic", "approver"]), asyncHandler(deleteLocation));

module.exports = router;
