const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/sections
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  const sections = db.query(`
    SELECT s.*,
      (SELECT COUNT(*) FROM student_sections WHERE section_id = s.id) AS student_count,
      (SELECT COUNT(*) FROM subjects WHERE section_id = s.id) AS subject_count
    FROM sections s
    ORDER BY s.name ASC
  `);
  res.json({ sections });
});

// GET /api/sections/:id
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const section = db.get('SELECT * FROM sections WHERE id = ?', [req.params.id]);
  if (!section) {
    return res.status(404).json({ error: 'Section not found' });
  }

  const students = db.query(`
    SELECT u.id, u.name, u.email, u.roll_number, u.department
    FROM users u
    JOIN student_sections ss ON u.id = ss.student_id
    WHERE ss.section_id = ?
    ORDER BY u.roll_number ASC, u.name ASC
  `, [req.params.id]);

  const subjects = db.query(`
    SELECT sub.*, u.name as faculty_name
    FROM subjects sub
    LEFT JOIN users u ON sub.faculty_id = u.id
    WHERE sub.section_id = ?
  `, [req.params.id]);

  res.json({ section, students, subjects });
});

// POST /api/sections (Faculty/Admin)
router.post('/', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const { name, semester, academic_year, department } = req.body;

  if (!name || !semester || !academic_year) {
    return res.status(400).json({ error: 'Name, semester, and academic year are required' });
  }

  const db = getDb();
  const result = db.run(`
    INSERT INTO sections (name, semester, academic_year, department)
    VALUES (?, ?, ?, ?)
  `, [name, semester, academic_year, department || 'General']);

  res.status(201).json({
    message: 'Section created successfully',
    sectionId: result.lastInsertRowid
  });
});

// POST /api/sections/:id/enroll - Enroll student into section
router.post('/:id/enroll', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const { student_id } = req.body;
  const sectionId = req.params.id;

  if (!student_id) {
    return res.status(400).json({ error: 'student_id is required' });
  }

  const db = getDb();
  db.run('INSERT OR IGNORE INTO student_sections (student_id, section_id) VALUES (?, ?)', [student_id, sectionId]);

  // Also auto-enroll in all subjects of this section
  const sectionSubjects = db.query('SELECT id FROM subjects WHERE section_id = ?', [sectionId]);
  for (const sub of sectionSubjects) {
    db.run('INSERT OR IGNORE INTO student_subjects (student_id, subject_id) VALUES (?, ?)', [student_id, sub.id]);
  }

  res.json({ message: 'Student enrolled into section and subjects successfully' });
});

module.exports = router;
