const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/assessments - List assessments for a subject
router.get('/', authenticateToken, (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) {
    return res.status(400).json({ error: 'subjectId query parameter is required' });
  }

  const db = getDb();
  const assessments = db.query(`
    SELECT a.*,
      sub.name AS subject_name,
      sub.code AS subject_code,
      COUNT(m.id) AS marks_entered_count,
      AVG(m.marks_obtained) AS class_average,
      MAX(m.marks_obtained) AS highest_score,
      MIN(m.marks_obtained) AS lowest_score
    FROM assessments a
    JOIN subjects sub ON a.subject_id = sub.id
    LEFT JOIN marks m ON a.id = m.assessment_id
    WHERE a.subject_id = ?
    GROUP BY a.id
    ORDER BY a.date ASC
  `, [subjectId]);

  const formatted = assessments.map(a => ({
    ...a,
    class_average: a.class_average !== null ? Math.round(a.class_average * 10) / 10 : null,
    pass_mark: Math.round(a.max_marks * 0.4 * 10) / 10
  }));

  res.json({ assessments: formatted });
});

// GET /api/assessments/:id/marks - Get marks sheet for an assessment
router.get('/:id/marks', authenticateToken, (req, res) => {
  const assessmentId = req.params.id;
  const db = getDb();

  const assessment = db.get(`
    SELECT a.*, sub.name AS subject_name, sub.code AS subject_code
    FROM assessments a
    JOIN subjects sub ON a.subject_id = sub.id
    WHERE a.id = ?
  `, [assessmentId]);

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  // Get all enrolled students for this subject and their marks (if entered)
  const students = db.query(`
    SELECT 
      u.id AS student_id,
      u.name AS student_name,
      u.roll_number,
      u.email,
      m.id AS mark_id,
      m.marks_obtained,
      m.remarks
    FROM users u
    JOIN student_subjects ss ON u.id = ss.student_id
    LEFT JOIN marks m ON m.student_id = u.id AND m.assessment_id = ?
    WHERE ss.subject_id = ?
    ORDER BY u.roll_number ASC, u.name ASC
  `, [assessmentId, assessment.subject_id]);

  // Compute stats
  const enteredMarks = students.filter(s => s.marks_obtained !== null && s.marks_obtained !== undefined);
  const totalStudents = students.length;
  let avg = 0;
  let highest = null;
  let lowest = null;
  let passCount = 0;
  const passThreshold = assessment.max_marks * 0.4; // 40% pass standard

  if (enteredMarks.length > 0) {
    const sum = enteredMarks.reduce((acc, curr) => acc + curr.marks_obtained, 0);
    avg = Math.round((sum / enteredMarks.length) * 10) / 10;
    highest = Math.max(...enteredMarks.map(m => m.marks_obtained));
    lowest = Math.min(...enteredMarks.map(m => m.marks_obtained));
    passCount = enteredMarks.filter(m => m.marks_obtained >= passThreshold).length;
  }

  res.json({
    assessment,
    stats: {
      totalStudents,
      enteredCount: enteredMarks.length,
      average: avg,
      highest,
      lowest,
      passThreshold,
      passCount,
      failCount: enteredMarks.length - passCount
    },
    students
  });
});

// POST /api/assessments - Create new assessment (Faculty/Admin)
router.post('/', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const { subject_id, title, type, max_marks, weightage, date } = req.body;

  if (!subject_id || !title || !max_marks || !date) {
    return res.status(400).json({ error: 'subject_id, title, max_marks, and date are required' });
  }

  const db = getDb();
  const result = db.run(`
    INSERT INTO assessments (subject_id, title, type, max_marks, weightage, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    subject_id,
    title,
    type || 'Internal Exam',
    parseFloat(max_marks),
    weightage ? parseFloat(weightage) : 20.0,
    date
  ]);

  res.status(201).json({
    message: 'Assessment created successfully',
    assessmentId: result.lastInsertRowid
  });
});

// POST /api/assessments/:id/marks - Batch save or update marks
router.post('/:id/marks', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const assessmentId = req.params.id;
  const { marks } = req.body;

  if (!Array.isArray(marks)) {
    return res.status(400).json({ error: 'marks must be an array of { student_id, marks_obtained, remarks }' });
  }

  const db = getDb();
  const assessment = db.get('SELECT * FROM assessments WHERE id = ?', [assessmentId]);
  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  for (const item of marks) {
    if (item.student_id && item.marks_obtained !== undefined && item.marks_obtained !== null && item.marks_obtained !== '') {
      const score = Math.min(assessment.max_marks, Math.max(0, parseFloat(item.marks_obtained)));
      db.run(`
        INSERT INTO marks (assessment_id, student_id, marks_obtained, remarks)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(assessment_id, student_id) DO UPDATE SET
          marks_obtained = excluded.marks_obtained,
          remarks = excluded.remarks
      `, [assessmentId, item.student_id, score, item.remarks || '']);
    }
  }

  res.json({ message: 'Marks saved successfully', count: marks.length });
});

// PUT /api/assessments/:id
router.put('/:id', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const { title, type, max_marks, weightage, date } = req.body;
  const db = getDb();

  const assessment = db.get('SELECT * FROM assessments WHERE id = ?', [req.params.id]);
  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  db.run(`
    UPDATE assessments
    SET title = ?, type = ?, max_marks = ?, weightage = ?, date = ?
    WHERE id = ?
  `, [
    title || assessment.title,
    type || assessment.type,
    max_marks ? parseFloat(max_marks) : assessment.max_marks,
    weightage ? parseFloat(weightage) : assessment.weightage,
    date || assessment.date,
    req.params.id
  ]);

  res.json({ message: 'Assessment updated successfully' });
});

// DELETE /api/assessments/:id
router.delete('/:id', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const db = getDb();
  db.run('DELETE FROM marks WHERE assessment_id = ?', [req.params.id]);
  db.run('DELETE FROM assessments WHERE id = ?', [req.params.id]);
  res.json({ message: 'Assessment and marks deleted successfully' });
});

module.exports = router;
