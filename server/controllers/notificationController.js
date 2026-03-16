import prisma from '../config/prisma.js';

export const getNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20
    });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    await prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true }
    });
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const clearAllNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    await prisma.notification.deleteMany({
      where: { user_id: userId }
    });
    res.status(200).json({ message: 'Notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
