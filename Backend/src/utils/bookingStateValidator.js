const validTransitions = {
  Pending: ["Approved", "Rejected", "Cancellation Requested"],
  Approved: ["Assigned", "Cancellation Requested"],
  Assigned: ["In Progress", "Cancelled", "Cancellation Requested"],
  "In Progress": ["Completed", "Delayed"],
  Delayed: ["Completed", "Assigned"],
  "Cancellation Requested": ["Cancelled", "Rejected"],
  Cancelled: [],
  Completed: [],
  Rejected: [],

  // 4-stage workflow (strict)
  "Pending Guide Approval": ["Cancellation Requested"],
  "Guide Approved": ["Cancellation Requested", "Pending OIC Approval"],
  "Pending OIC Approval": ["Assigned", "Rejected"]
};

exports.isValidTransition = (currentStatus, newStatus) => {
  return validTransitions[currentStatus]?.includes(newStatus);
};