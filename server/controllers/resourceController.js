import { query } from '../config/db.js';

export const getAllResources = async (req, res) => {
  const { type, status, capacity_min, search } = req.query;
  
  try {
    let queryText = 'SELECT * FROM resources WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (type) {
      queryText += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    if (status) {
      queryText += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (capacity_min) {
      queryText += ` AND capacity >= $${paramIndex++}`;
      params.push(capacity_min);
    }

    if (search) {
      queryText += ` AND (name ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    res.status(200).json({ resources: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getResourceById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM resources WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createResource = async (req, res) => {
  const { name, type, capacity, location, status = 'available', image_url } = req.body;

  try {
    // Check for unique name
    const existing = await query('SELECT * FROM resources WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Resource name already exists' });
    }

    const result = await query(
      'INSERT INTO resources (name, type, capacity, location, status, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, type, capacity, location, status, image_url]
    );

    res.status(201).json({ message: 'Resource created successfully', resource: result.rows[0] });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateResource = async (req, res) => {
  const { id } = req.params;
  const { name, type, capacity, location, status, image_url } = req.body;

  try {
    // Check existence
    const existing = await query('SELECT * FROM resources WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check name uniqueness if changed
    if (name && name !== existing.rows[0].name) {
      const nameCheck = await query('SELECT * FROM resources WHERE name = $1', [name]);
      if (nameCheck.rows.length > 0) {
        return res.status(409).json({ message: 'Resource name already exists' });
      }
    }

    const result = await query(
      `UPDATE resources 
       SET name = COALESCE($1, name), 
           type = COALESCE($2, type), 
           capacity = COALESCE($3, capacity), 
           location = COALESCE($4, location), 
           status = COALESCE($5, status), 
           image_url = COALESCE($6, image_url),
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, type, capacity, location, status, image_url, id]
    );

    res.status(200).json({ message: 'Resource updated successfully', resource: result.rows[0] });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteResource = async (req, res) => {
  const { id } = req.params;
  const { force = false } = req.query;

  try {
    // Check if resource has future bookings
    const bookings = await query(
      "SELECT * FROM bookings WHERE resource_id = $1 AND status != 'cancelled' AND end_time > NOW()",
      [id]
    );

    if (bookings.rows.length > 0 && !force) {
      return res.status(409).json({ 
        message: 'Resource has future bookings. Cancel them first or use force flag.',
        pending_bookings: bookings.rows.length 
      });
    }

    await query('DELETE FROM resources WHERE id = $1', [id]);
    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
