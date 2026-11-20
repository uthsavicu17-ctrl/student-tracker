const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/subjects
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  let subjects;

  if (req.user.role === 'student') {
    subjects = db.query(`
      SELECT s.*, 
        u.name AS faculty_name,
        u.email AS faculty_email,
        sec.name AS section_name,
        (SELECT COUNT(*) FROM attendance_sessions WHERE subject_id = s.id) AS total_sessions_conducted,
        (SELECT COUNT(*) FROM student_subjects WHERE subject_id = s.id) AS enrolled_students_count
      FROM subjects s
      JOIN student_subjects ss ON s.id = ss.subject_id
      LEFT JOIN users u ON s.faculty_id = u.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE ss.student_id = ?
      ORDER BY s.code ASC
    `, [req.user.id]);
  } else {
    // Faculty / Admin
    let query = `
      SELECT s.*, 
        u.name AS faculty_name,
        u.email AS faculty_email,
        sec.name AS section_name,
        (SELECT COUNT(*) FROM attendance_sessions WHERE subject_id = s.id) AS total_sessions_conducted,
        (SELECT COUNT(*) FROM student_subjects WHERE subject_id = s.id) AS enrolled_students_count
      FROM subjects s
      LEFT JOIN users u ON s.faculty_id = u.id
      LEFT JOIN sections sec ON s.section_id = sec.id
    `;
    const params = [];

    if (req.query.myOnly === 'true' || (req.user.role === 'faculty' && req.query.all !== 'true')) {
      query += ` WHERE s.faculty_id = ?`;
      params.push(req.user.id);
    }

    query += ` ORDER BY s.code ASC`;
    subjects = db.query(query, params);
  }

  res.json({ subjects });
});

// GET /api/subjects/:id
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const subject = db.get(`
    SELECT s.*, 
      u.name AS faculty_name,
      u.email AS faculty_email,
      sec.name AS section_name,
      (SELECT COUNT(*) FROM attendance_sessions WHERE subject_id = s.id) AS total_sessions_conducted,
      (SELECT COUNT(*) FROM student_subjects WHERE subject_id = s.id) AS enrolled_students_count
    FROM subjects s
    LEFT JOIN users u ON s.faculty_id = u.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    WHERE s.id = ?
  `, [req.params.id]);

  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  res.json({ subject });
});

// GET /api/subjects/:id/students - Enrolled students with attendance and marks statistics
router.get('/:id/students', authenticateToken, (req, res) => {
  const db = getDb();
  const subjectId = req.params.id;

  const subject = db.get('SELECT * FROM subjects WHERE id = ?', [subjectId]);
  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  // Get enrolled students
  const students = db.query(`
    SELECT u.id, u.name, u.email, u.roll_number, u.department
    FROM users u
    JOIN student_subjects ss ON u.id = ss.student_id
    WHERE ss.subject_id = ?
    ORDER BY u.roll_number ASC, u.name ASC
  `, [subjectId]);

  // Total sessions conducted for this subject
  const totalSessionsRow = db.get(`
    SELECT COUNT(*) AS count FROM attendance_sessions WHERE subject_id = ?
  `, [subjectId]);
  const totalSessions = totalSessionsRow ? totalSessionsRow.count : 0;

  // Compute student attendance and performance for each
  const studentsWithStats = students.map(student => {
    // Attendance counts
    const attStats = db.get(`
      SELECT 
        SUM(CASE WHEN ar.status = 'Present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN ar.status = 'Late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN ar.status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN ar.status = 'Excused' THEN 1 ELSE 0 END) AS excused_count,
        COUNT(ar.id) AS total_marked
      FROM attendance_records ar
      JOIN attendance_sessions ses ON ar.session_id = ses.id
      WHERE ses.subject_id = ? AND ar.student_id = ?
    `, [subjectId, student.id]) || { present_count: 0, late_count: 0, absent_count: 0, excused_count: 0, total_marked: 0 };

    const present = attStats.present_count || 0;
    const late = attStats.late_count || 0;
    const absent = attStats.absent_count || 0;
    const totalMarked = totalSessions > 0 ? totalSessions : (attStats.total_marked || 0);

    // Standard formula: Present + (Late * 0.5) or Present / Total
    const effectiveAttended = present + (late * 0.5);
    const attendancePercentage = totalMarked > 0 ? Math.round((effectiveAttended / totalMarked) * 100 * 10) / 10 : 100;
    const isAtRisk = attendancePercentage < (subject.attendance_threshold || 75.0);

    // Assessment marks for this subject
    const marksData = db.query(`
      SELECT 
        a.id AS assessment_id,
        a.title,
        a.max_marks,
        a.weightage,
        m.marks_obtained
      FROM assessments a
      LEFT JOIN marks m ON a.id = m.assessment_id AND m.student_id = ?
      WHERE a.subject_id = ?
    `, [student.id, subjectId]);

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let weightedScore = 0;
    let totalWeightage = 0;

    marksData.forEach(m => {
      if (m.marks_obtained !== null && m.marks_obtained !== undefined) {
        totalMarksObtained += m.marks_obtained;
        totalMaxMarks += m.max_marks;
        if (m.max_marks > 0) {
          weightedScore += (m.marks_obtained / m.max_marks) * (m.weightage || 0);
          totalWeightage += (m.weightage || 0);
        }
      }
    });

    const marksPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100 * 10) / 10 : 0;
    const internalPercentage = totalWeightage > 0 ? Math.round((weightedScore / totalWeightage) * 100 * 10) / 10 : marksPercentage;

    return {
      ...student,
      attendance: {
        present,
        late,
        absent,
        excused: attStats.excused_count || 0,
        totalSessions,
        percentage: attendancePercentage,
        isAtRisk,
        threshold: subject.attendance_threshold || 75.0
      },
      academics: {
        totalMarksObtained,
        totalMaxMarks,
        marksPercentage,
        internalPercentage,
        marksBreakdown: marksData
      }
    };
  });

  res.json({
    subject,
    totalSessions,
    students: studentsWithStats
  });
});

// POST /api/subjects (Faculty/Admin)
router.post('/', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const { code, name, credits, section_id, faculty_id, total_classes_planned, attendance_threshold, description } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'Subject code and name are required' });
  }

  const db = getDb();
  const existing = db.get('SELECT id FROM subjects WHERE code = ?', [code]);
  if (existing) {
    return res.status(409).json({ error: 'Subject code already exists' });
  }

  const assignedFaculty = faculty_id || req.user.id;
  const result = db.run(`
    INSERT INTO subjects (code, name, credits, faculty_id, section_id, total_classes_planned, attendance_threshold, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    code,
    name,
    credits || 3,
    assignedFaculty,
    section_id || null,
    total_classes_planned || 45,
    attendance_threshold || 75.0,
    description || ''
  ]);

  const newSubjectId = result.lastInsertRowid;

  // Auto-enroll all students of section into this new subject if section_id provided
  if (section_id) {
    const sectionStudents = db.query('SELECT student_id FROM student_sections WHERE section_id = ?', [section_id]);
    for (const s of sectionStudents) {
      db.run('INSERT OR IGNORE INTO student_subjects (student_id, subject_id) VALUES (?, ?)', [s.student_id, newSubjectId]);
    }
  }

  res.status(201).json({
    message: 'Subject created successfully',
    subjectId: newSubjectId
  });
});

// PUT /api/subjects/:id
router.put('/:id', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const { name, credits, faculty_id, section_id, total_classes_planned, attendance_threshold, description } = req.body;
  const db = getDb();

  const subject = db.get('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  db.run(`
    UPDATE subjects
    SET name = ?, credits = ?, faculty_id = ?, section_id = ?, total_classes_planned = ?, attendance_threshold = ?, description = ?
    WHERE id = ?
  `, [
    name || subject.name,
    credits !== undefined ? credits : subject.credits,
    faculty_id || subject.faculty_id,
    section_id !== undefined ? section_id : subject.section_id,
    total_classes_planned !== undefined ? total_classes_planned : subject.total_classes_planned,
    attendance_threshold !== undefined ? attendance_threshold : subject.attendance_threshold,
    description !== undefined ? description : subject.description,
    req.params.id
  ]);

  res.json({ message: 'Subject updated successfully' });
});

// DELETE /api/subjects/:id
router.delete('/:id', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const db = getDb();
  db.run('DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE subject_id = ?)', [req.params.id]);
  db.run('DELETE FROM attendance_sessions WHERE subject_id = ?', [req.params.id]);
  db.run('DELETE FROM marks WHERE assessment_id IN (SELECT id FROM assessments WHERE subject_id = ?)', [req.params.id]);
  db.run('DELETE FROM assessments WHERE subject_id = ?', [req.params.id]);
  db.run('DELETE FROM student_subjects WHERE subject_id = ?', [req.params.id]);
  db.run('DELETE FROM subjects WHERE id = ?', [req.params.id]);

  res.json({ message: 'Subject and associated records deleted' });
});

module.exports = router;
