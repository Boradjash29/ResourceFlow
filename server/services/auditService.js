import prisma from '../config/prisma.js';

/**
 * Creates an audit log entry in the database.
 * @param {Object} params - The log details.
 * @param {string} params.userId - The ID of the user performing the action.
 * @param {string} params.action - The type of action (e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN').
 * @param {string} params.entityType - The type of entity affected (e.g., 'resource', 'booking', 'user').
 * @param {string} [params.entityId] - The ID of the affected entity.
 * @param {Object} [params.details] - Additional contextual details.
 * @param {string} [params.ipAddress] - IP address of the user.
 * @param {string} [params.userAgent] - User agent string.
 */
export const createAuditLog = async ({
  userId,
  action,
  entityType,
  entityId,
  details = {},
  ipAddress,
  userAgent
}) => {
  try {
    const log = await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking main application flow
    return null;
  }
};
