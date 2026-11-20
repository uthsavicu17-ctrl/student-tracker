const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  let query = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)';
  const params = [email];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  const user = db.get(query, params);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials or user not found' });
  }

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);

  // Return user without password
  const { password: _, ...userWithoutPass } = user;
  res.json({
    message: 'Login successful',
    token,
    user: userWithoutPass
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.get('SELECT id, name, email, role, roll_number, department, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let sections = [];
  let subjects = [];

  if (user.role === 'student') {
    sections = db.query(`
      SELECT s.* FROM sections s
      JOIN student_sections ss ON s.id = ss.section_id
      WHERE ss.student_id = ?
    `, [user.id]);

    subjects = db.query(`
      SELECT sub.*, u.name as faculty_name FROM subjects sub
      JOIN student_subjects ssub ON sub.id = ssub.subject_id
      LEFT JOIN users u ON sub.faculty_id = u.id
      WHERE ssub.student_id = ?
    `, [user.id]);
  } else if (user.role === 'faculty') {
    subjects = db.query(`
      SELECT sub.*, sec.name as section_name FROM subjects sub
      LEFT JOIN sections sec ON sub.section_id = sec.id
      WHERE sub.faculty_id = ?
    `, [user.id]);
  }

  res.json({
    user,
    sections,
    subjects
  });
});

// GET /api/auth/demo-users
router.get('/demo-users', (req, res) => {
  const db = getDb();
  const users = db.query(`
    SELECT id, name, email, role, roll_number, department
    FROM users
    WHERE email IN (
      'prof.sharma@college.edu',
      'dr.anita@college.edu',
      'aarav.patel@student.edu',
      'rahul.verma@student.edu',
      'priya.singh@student.edu'
    )
    ORDER BY role ASC, name ASC
  `);
  res.json({ users, defaultPassword: 'password123' });
});

// POST /api/auth/register (Faculty or Admin can add new student/faculty)
router.post('/register', authenticateToken, (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only faculty or admins can register new users' });
  }

  const { name, email, password, role, roll_number, department, section_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const db = getDb();
  const existing = db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const passwordHash = bcrypt.hashSync(password, 8);
  const result = db.run(`
    INSERT INTO users (name, email, password, role, roll_number, department)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [name, email, passwordHash, role, roll_number || null, department || 'General']);

  const newUserId = result.lastInsertRowid;

  if (role === 'student' && section_id) {
    db.run('INSERT INTO student_sections (student_id, section_id) VALUES (?, ?)', [newUserId, section_id]);
    // Also auto-enroll in all subjects of that section
    const sectionSubjects = db.query('SELECT id FROM subjects WHERE section_id = ?', [section_id]);
    for (const sub of sectionSubjects) {
      db.run('INSERT OR IGNORE INTO student_subjects (student_id, subject_id) VALUES (?, ?)', [newUserId, sub.id]);
    }
  }

  res.status(201).json({
    message: 'User registered successfully',
    userId: newUserId
  });
});

module.exports = router;
