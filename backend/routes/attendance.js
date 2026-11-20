const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/attendance/sessions - List sessions for a subject
router.get('/sessions', authenticateToken, (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) {
    return res.status(400).json({ error: 'subjectId query parameter is required' });
  }

  const db = getDb();
  const sessions = db.query(`
    SELECT ses.*,
      u.name AS faculty_name,
      sub.name AS subject_name,
      sub.code AS subject_code,
      COUNT(ar.id) AS total_marked,
      SUM(CASE WHEN ar.status = 'Present' THEN 1 ELSE 0 END) AS present_count,
      SUM(CASE WHEN ar.status = 'Late' THEN 1 ELSE 0 END) AS late_count,
      SUM(CASE WHEN ar.status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
      SUM(CASE WHEN ar.status = 'Excused' THEN 1 ELSE 0 END) AS excused_count
    FROM attendance_sessions ses
    JOIN subjects sub ON ses.subject_id = sub.id
    LEFT JOIN users u ON ses.faculty_id = u.id
    LEFT JOIN attendance_records ar ON ses.id = ar.session_id
    WHERE ses.subject_id = ?
    GROUP BY ses.id
    ORDER BY ses.date DESC, ses.id DESC
  `, [subjectId]);

  res.json({ sessions });
});

// GET /api/attendance/sessions/:id - Get session details and student roster
router.get('/sessions/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const session = db.get(`
    SELECT ses.*,
      sub.name AS subject_name,
      sub.code AS subject_code,
      u.name AS faculty_name
    FROM attendance_sessions ses
    JOIN subjects sub ON ses.subject_id = sub.id
    LEFT JOIN users u ON ses.faculty_id = u.id
    WHERE ses.id = ?
  `, [req.params.id]);

  if (!session) {
    return res.status(404).json({ error: 'Attendance session not found' });
  }

  const records = db.query(`
    SELECT 
      ar.id AS record_id,
      ar.status,
      ar.remarks,
      u.id AS student_id,
      u.name AS student_name,
      u.roll_number,
      u.email
    FROM attendance_records ar
    JOIN users u ON ar.student_id = u.id
    WHERE ar.session_id = ?
    ORDER BY u.roll_number ASC, u.name ASC
  `, [req.params.id]);

  res.json({ session, records });
});

// POST /api/attendance/sessions - Record new attendance session with roster
router.post('/sessions', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const { subject_id, date, topic, remarks, records } = req.body;

  if (!subject_id || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'subject_id, date, and records array are required' });
  }

  const db = getDb();

  // Create session
  const facultyId = req.user.id;
  const sessionResult = db.run(`
    INSERT INTO attendance_sessions (subject_id, date, faculty_id, topic, remarks)
    VALUES (?, ?, ?, ?, ?)
  `, [subject_id, date, facultyId, topic || 'Lecture / Lab Session', remarks || '']);

  const sessionId = sessionResult.lastInsertRowid;

  // Insert records
  for (const item of records) {
    if (item.student_id && item.status) {
      db.run(`
        INSERT INTO attendance_records (session_id, student_id, status, remarks)
        VALUES (?, ?, ?, ?)
      `, [sessionId, item.student_id, item.status, item.remarks || '']);
    }
  }

  res.status(201).json({
    message: 'Attendance recorded successfully',
    sessionId,
    totalRecords: records.length
  });
});

// PUT /api/attendance/sessions/:id - Update existing session and records
router.put('/sessions/:id', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const { date, topic, remarks, records } = req.body;
  const sessionId = req.params.id;
  const db = getDb();

  const session = db.get('SELECT * FROM attendance_sessions WHERE id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ error: 'Attendance session not found' });
  }

  db.run(`
    UPDATE attendance_sessions
    SET date = ?, topic = ?, remarks = ?
    WHERE id = ?
  `, [
    date || session.date,
    topic !== undefined ? topic : session.topic,
    remarks !== undefined ? remarks : session.remarks,
    sessionId
  ]);

  if (Array.isArray(records)) {
    for (const item of records) {
      if (item.student_id && item.status) {
        db.run(`
          INSERT INTO attendance_records (session_id, student_id, status, remarks)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(session_id, student_id) DO UPDATE SET
            status = excluded.status,
            remarks = excluded.remarks
        `, [sessionId, item.student_id, item.status, item.remarks || '']);
      }
    }
  }

  res.json({ message: 'Attendance updated successfully' });
});

// DELETE /api/attendance/sessions/:id - Delete session
router.delete('/sessions/:id', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const sessionId = req.params.id;
  const db = getDb();
  db.run('DELETE FROM attendance_records WHERE session_id = ?', [sessionId]);
  db.run('DELETE FROM attendance_sessions WHERE id = ?', [sessionId]);
  res.json({ message: 'Attendance session deleted successfully' });
});

// GET /api/attendance/student/:studentId - Full attendance history for a student
router.get('/student/:studentId', authenticateToken, (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);

  // Security check: student can only view their own records unless faculty/admin
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Access denied: You can only view your own attendance' });
  }

  const { subjectId } = req.query;
  const db = getDb();

  let query = `
    SELECT 
      ar.id AS record_id,
      ar.status,
      ar.remarks AS record_remarks,
      ses.id AS session_id,
      ses.date,
      ses.topic,
      sub.id AS subject_id,
      sub.code AS subject_code,
      sub.name AS subject_name,
      sub.attendance_threshold,
      sub.total_classes_planned,
      u.name AS faculty_name,
      cr.id AS correction_id,
      cr.status AS correction_status,
      cr.requested_status AS correction_requested_status,
      cr.student_reason AS correction_reason,
      cr.decision_reason AS correction_decision_reason,
      cr.decision_timestamp AS correction_decision_timestamp
    FROM attendance_records ar
    JOIN attendance_sessions ses ON ar.session_id = ses.id
    JOIN subjects sub ON ses.subject_id = sub.id
    LEFT JOIN users u ON ses.faculty_id = u.id
    LEFT JOIN attendance_correction_requests cr ON ar.id = cr.attendance_record_id AND cr.status = 'Pending'
    WHERE ar.student_id = ?
  `;
  const params = [studentId];

  if (subjectId) {
    query += ' AND sub.id = ?';
    params.push(subjectId);
  }

  query += ' ORDER BY ses.date DESC';
  const history = db.query(query, params);

  // Consistent attendance calculation:
  // Present = 1.0, Late = 0.5, Excused = 1.0, Absent = 0.0
  const total = history.length;
  const present = history.filter(h => h.status === 'Present').length;
  const late = history.filter(h => h.status === 'Late').length;
  const absent = history.filter(h => h.status === 'Absent').length;
  const excused = history.filter(h => h.status === 'Excused').length;
  const effective = present + (late * 0.5) + excused;
  const percentage = total > 0 ? Math.round((effective / total) * 100 * 10) / 10 : 100;
  const pendingCorrectionsCount = history.filter(h => h.correction_status === 'Pending').length;

  res.json({
    summary: {
      total,
      present,
      late,
      absent,
      excused,
      effectiveAttended: effective,
      percentage,
      isAtRisk: percentage < 75.0,
      pendingCorrectionsCount
    },
    history
  });
});

module.exports = router;
