import prisma from '../config/prisma.js';

/**
 * Logs a security or system event to the AuditLog table.
 * @param {Object} params
 * @param {string} params.userId - The ID of the user performing the action (optional)
 * @param {string} params.action - The action performed (e.g., 'LOGIN', 'PASSWORD_RESET')
 * @param {string} params.entityType - The type of entity affected (e.g., 'USER', 'SESSION', '2FA')
 * @param {string} params.entityId - The ID of the entity affected (optional)
 * @param {Object} params.details - Additional metadata for the event (optional)
 * @param {Object} params.req - The Express request object to extract IP and User Agent (optional)
 */
/**
 * Logs a security or system event to the AuditLog table.
 * Supports both passing the 'req' object or explicit 'ipAddress' and 'userAgent'.
 */
export const logEvent = async ({ 
  userId, 
  action, 
  entityType, 
  entityId, 
  details, 
  req, 
  ipAddress, 
  userAgent 
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId || null,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || {},
        ip_address: ipAddress || (req ? req.ip : null),
        user_agent: userAgent || (req ? req.headers['user-agent'] : null),
      },
    });
  } catch (error) {
    console.error(`Audit Log Error [Action: ${action}, User: ${userId}]:`, error);
  }
};

export const createAuditLog = logEvent;
