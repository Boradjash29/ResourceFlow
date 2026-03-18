import prisma from '../config/prisma.js';

export const getAuditLogs = async (req, res) => {
  try {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (action) where.action = action;
    
    if (userId) {
      // Basic UUID validation to prevent Prisma crashes
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userId)) {
        where.user_id = userId;
      } else {
        return res.status(400).json({ message: 'Invalid User ID format' });
      }
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.status(200).json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
};
