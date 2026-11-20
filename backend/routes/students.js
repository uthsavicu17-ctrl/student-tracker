const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/students - List all students with attendance & performance metrics
router.get('/', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const db = getDb();
  const students = db.query(`
    SELECT u.id, u.name, u.email, u.roll_number, u.department,
      (SELECT name FROM sections s JOIN student_sections ss ON s.id = ss.section_id WHERE ss.student_id = u.id LIMIT 1) as section_name
    FROM users u
    WHERE u.role = 'student'
    ORDER BY u.roll_number ASC, u.name ASC
  `);

  const enriched = students.map(st => {
    // Attendance across all subjects
    const att = db.get(`
      SELECT 
        COUNT(ar.id) AS total_records,
        SUM(CASE WHEN ar.status = 'Present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN ar.status = 'Late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN ar.status = 'Absent' THEN 1 ELSE 0 END) AS absent_count
      FROM attendance_records ar
      WHERE ar.student_id = ?
    `, [st.id]);

    const total = att ? att.total_records : 0;
    const attended = (att ? att.present_count : 0) + ((att ? att.late_count : 0) * 0.5);
    const overallAttendance = total > 0 ? Math.round((attended / total) * 100 * 10) / 10 : 100;

    // Academic score across all subjects
    const marksData = db.get(`
      SELECT 
        AVG((m.marks_obtained / a.max_marks) * 100) AS avg_percentage,
        COUNT(m.id) as assessments_taken
      FROM marks m
      JOIN assessments a ON m.assessment_id = a.id
      WHERE m.student_id = ?
    `, [st.id]);

    const marksPercentage = marksData && marksData.avg_percentage !== null 
      ? Math.round(marksData.avg_percentage * 10) / 10 
      : 0;

    return {
      ...st,
      overallAttendance,
      totalClasses: total,
      attendedClasses: attended,
      absentClasses: att ? att.absent_count : 0,
      marksPercentage,
      assessmentsTaken: marksData ? marksData.assessments_taken : 0,
      isAtRisk: overallAttendance < 75.0 || (marksData && marksData.assessments_taken > 0 && marksPercentage < 50)
    };
  });

  res.json({ students: enriched });
});

// GET /api/students/:id
router.get('/:id', authenticateToken, (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const db = getDb();
  const student = db.get(`
    SELECT u.id, u.name, u.email, u.roll_number, u.department,
      (SELECT name FROM sections s JOIN student_sections ss ON s.id = ss.section_id WHERE ss.student_id = u.id LIMIT 1) as section_name
    FROM users u
    WHERE u.id = ? AND u.role = 'student'
  `, [studentId]);

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  res.json({ student });
});

module.exports = router;
