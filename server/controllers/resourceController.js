import prisma from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';
import { syncSingleResource } from '../rag/embeddings.js';

export const getResourceTypes = async (req, res) => {
  try {
    const types = await prisma.resource.findMany({
      select: { type: true },
      distinct: ['type'],
    });
    res.status(200).json({ types: types.map(r => r.type).filter(Boolean) });
  } catch (error) {
    console.error('Error fetching resource types:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllResources = async (req, res) => {
  const { type, status, capacity_min, location, search, page = 1, limit = 10, sort_by = 'created_at', sort_order = 'desc' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  
  try {
    const where = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (capacity_min) where.capacity = { gte: parseInt(capacity_min) };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip,
        take,
        orderBy: { [sort_by]: sort_order }
      }),
      prisma.resource.count({ where })
    ]);

    res.status(200).json({ 
      resources, 
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getResourceById = async (req, res) => {
  const { id } = req.params;
  try {
    const resource = await prisma.resource.findUnique({
      where: { id }
    });
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.status(200).json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createResource = async (req, res) => {
  const { name, type, capacity, location, status = 'available', image_url, description } = req.body;

  try {
    const existing = await prisma.resource.findUnique({
      where: { name }
    });
    
    if (existing) {
      return res.status(409).json({ message: 'Resource name already exists' });
    }

    const resource = await prisma.resource.create({
      data: {
        name,
        type,
        capacity: parseInt(capacity) || 0,
        location,
        status,
        image_url,
        description
      }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'resource',
      entityId: resource.id,
      details: { name: resource.name, type: resource.type },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Sync (Phase 2D) - Awaited for better reliability
    try {
      await syncSingleResource(resource.id);
    } catch (err) {
      console.error('Failed to sync new resource:', err);
    }

    res.status(201).json({ message: 'Resource created successfully', resource });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateResource = async (req, res) => {
  const { id } = req.params;
  const { name, type, capacity, location, status, image_url, description } = req.body;

  try {
    const existing = await prisma.resource.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (name && name !== existing.name) {
      const nameCheck = await prisma.resource.findUnique({
        where: { name }
      });
      if (nameCheck) {
        return res.status(409).json({ message: 'Resource name already exists' });
      }
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        name,
        type,
        capacity: capacity ? parseInt(capacity) : undefined,
        location,
        status,
        image_url,
        description,
        updated_at: new Date()
      }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'resource',
      entityId: resource.id,
      details: { name: resource.name, changes: req.body },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Sync (Phase 2D) - Awaited for better reliability
    try {
       await syncSingleResource(resource.id);
    } catch (err) {
       console.error('Failed to sync updated resource:', err);
    }

    res.status(200).json({ message: 'Resource updated successfully', resource });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteResource = async (req, res) => {
  const { id } = req.params;
  const { force = false } = req.query;

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        resource_id: id,
        status: { not: 'cancelled' },
        end_time: { gt: new Date() }
      }
    });

    const isForce = force === 'true' || force === true;
    if (bookings.length > 0 && !isForce) {
      return res.status(409).json({ 
        message: 'Resource has future bookings. Cancel them first or use force flag.',
        pending_bookings: bookings.length 
      });
    }

    await prisma.resource.delete({
      where: { id }
    });
    
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'resource',
      entityId: id,
      details: { id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const bulkUpdateResources = async (req, res) => {
  const { ids, status } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No resource IDs provided' });
  }

  try {
    const result = await prisma.resource.updateMany({
      where: { id: { in: ids } },
      data: { status, updated_at: new Date() }
    });

    await createAuditLog({
      userId,
      action: 'BULK_UPDATE_RESOURCES',
      entityType: 'resource',
      details: { ids, status, updatedCount: result.count },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ message: `Successfully updated ${result.count} resources`, count: result.count });

    // Bulk background sync
    Promise.all(ids.map(id => syncSingleResource(id))).catch(err => console.error('Failed bulk sync:', err));
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const bulkDeleteResources = async (req, res) => {
  const { ids } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No resource IDs provided' });
  }

  try {
    const result = await prisma.resource.deleteMany({
      where: { id: { in: ids } }
    });

    await createAuditLog({
      userId,
      action: 'BULK_DELETE_RESOURCES',
      entityType: 'resource',
      details: { ids, deletedCount: result.count },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ message: `Successfully deleted ${result.count} resources`, count: result.count });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
