/**
 * Centralized permission configuration for the AI Assistant.
 */
export const PERMISSIONS = {
  employee: {
    allowed_actions: [
      'BOOK_ACTION',
      'UPDATE_BOOKING_ACTION',
      'CANCEL_BOOK_ACTION',
      'SEARCH_RESOURCES',
      'VIEW_OWN_BOOKINGS'
    ],
    denied_actions: [
      'ADD_RESOURCE_ACTION',
      'UPDATE_RESOURCE_ACTION',
      'DELETE_RESOURCE_ACTION',
      'VIEW_ALL_BOOKINGS',
      'CANCEL_OTHERS_BOOKING'
    ]
  },
  
  admin: {
    allowed_actions: [
      'ADD_RESOURCE_ACTION',
      'UPDATE_RESOURCE_ACTION',
      'DELETE_RESOURCE_ACTION',
      'CANCEL_BOOK_ACTION', // Can cancel any booking
      'SEARCH_RESOURCES',
      'VIEW_ALL_BOOKINGS'
    ],
    denied_actions: [
      'BOOK_ACTION', // Admins shouldn't book for themselves via AI usually
      'UPDATE_BOOKING_ACTION' // Logic for "own booking" vs "any booking" handled in service
    ]
  }
};

/**
 * Checks if a role is allowed to perform a specific action tag.
 * @param {string} role - The user's role (employee or admin).
 * @param {string} actionTag - The action tag from the AI response (e.g. BOOK_ACTION).
 * @returns {boolean}
 */
export const canPerformAction = (role, actionTag) => {
  const roleLower = role?.toLowerCase();
  const rolePerms = PERMISSIONS[roleLower];
  if (!rolePerms) return false;
  
  return rolePerms.allowed_actions.includes(actionTag);
};

/**
 * Returns a human-friendly denial message based on the action.
 */
export const getDenialMessage = (actionTag) => {
  const messages = {
    'ADD_RESOURCE_ACTION': "Only administrators can add resources.",
    'UPDATE_RESOURCE_ACTION': "Only administrators can modify resource details.",
    'DELETE_RESOURCE_ACTION': "Only administrators are authorized to delete resources from the system.",
    'BOOK_ACTION': "Administrators manage resources but cannot book them. Employees can make bookings.",
    'CANCEL_OTHERS_BOOKING': "You do not have permission to cancel bookings made by other employees."
  };
  
  return messages[actionTag] || "You don't have permission to perform this specific action.";
};
