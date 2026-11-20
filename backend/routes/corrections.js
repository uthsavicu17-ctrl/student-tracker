const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const VALID_STATUSES = ['Present', 'Late', 'Absent', 'Excused'];

// POST /api/corrections — Student submits a correction request
router.post('/', authenticateToken, requireRole('student'), (req, res) => {
  const { attendance_record_id, requested_status } = req.body;
  const reason = req.body.reason || req.body.student_reason;
  const evidence_text = req.body.evidence_text || req.body.evidence_notes;
  const studentId = req.user.id;

  if (!attendance_record_id || !requested_status || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'attendance_record_id, requested_status, and non-empty reason are required' });
  }

  if (!VALID_STATUSES.includes(requested_status)) {
    return res.status(400).json({ error: `Invalid requested_status. Allowed values: ${VALID_STATUSES.join(', ')}` });
  }

  const db = getDb();

  // 1. Verify student owns the attendance record
  const record = db.get(`
    SELECT ar.id, ar.status, ar.student_id, ses.subject_id, ses.date, sub.name as subject_name, sub.code as subject_code
    FROM attendance_records ar
    JOIN attendance_sessions ses ON ar.session_id = ses.id
    JOIN subjects sub ON ses.subject_id = sub.id
    WHERE ar.id = ?
  `, [attendance_record_id]);

  if (!record) {
    return res.status(404).json({ error: 'Attendance record not found' });
  }

  if (record.student_id !== studentId) {
    return res.status(403).json({ error: 'Access denied: You can only dispute your own attendance records' });
  }

  if (record.status === requested_status) {
    return res.status(400).json({ error: `Record is already marked as ${requested_status}. No dispute needed.` });
  }

  // 2. Prevent duplicate pending requests
  const existingPending = db.get(`
    SELECT id FROM attendance_correction_requests
    WHERE attendance_record_id = ? AND status = 'Pending'
  `, [attendance_record_id]);

  if (existingPending) {
    return res.status(409).json({
      error: 'This attendance record already has a pending dispute (Request ID #' + existingPending.id + ')'
    });
  }

  // 3. Insert correction request and audit event atomically
  try {
    const insertRes = db.run(`
      INSERT INTO attendance_correction_requests (
        attendance_record_id, student_id, original_status, requested_status,
        student_reason, evidence_text, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `, [
      attendance_record_id,
      studentId,
      record.status,
      requested_status,
      reason.trim(),
      evidence_text ? evidence_text.trim() : null
    ]);

    const requestId = insertRes.lastInsertRowid;

    // Append-only audit trail
    db.run(`
      INSERT INTO attendance_audit_events (
        attendance_record_id, request_id, acting_user_id, acting_role,
        event_type, previous_status, new_status, reason
      ) VALUES (?, ?, ?, 'student', 'CORRECTION_REQUESTED', ?, ?, ?)
    `, [
      attendance_record_id,
      requestId,
      studentId,
      record.status,
      requested_status,
      reason.trim()
    ]);

    res.status(201).json({
      message: 'Attendance correction dispute submitted successfully',
      requestId,
      original_status: record.status,
      originalStatus: record.status,
      requested_status,
      requestedStatus: requested_status
    });
  } catch (err) {
    console.error('Error creating correction request:', err);
    res.status(500).json({ error: 'Failed to record correction request', details: err.message });
  }
});

// GET /api/corrections/student — Student views their own correction history
router.get('/student', authenticateToken, requireRole('student'), (req, res) => {
  const studentId = req.user.id;
  const db = getDb();

  const requests = db.query(`
    SELECT 
      cr.id AS request_id,
      cr.attendance_record_id,
      cr.original_status,
      cr.requested_status,
      cr.student_reason,
      cr.evidence_text,
      cr.status,
      cr.decision_reason,
      cr.decision_timestamp,
      cr.created_at AS submitted_at,
      ses.date AS lecture_date,
      ses.topic AS lecture_topic,
      sub.code AS subject_code,
      sub.name AS subject_name,
      rev.name AS reviewer_name
    FROM attendance_correction_requests cr
    JOIN attendance_records ar ON cr.attendance_record_id = ar.id
    JOIN attendance_sessions ses ON ar.session_id = ses.id
    JOIN subjects sub ON ses.subject_id = sub.id
    LEFT JOIN users rev ON cr.reviewer_id = rev.id
    WHERE cr.student_id = ?
    ORDER BY cr.created_at DESC
  `, [studentId]);

  res.json({ requests });
});

// GET /api/corrections/faculty — Faculty views correction requests for authorized subjects
router.get('/faculty', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const facultyId = req.user.id;
  const { status, subjectId } = req.query;
  const db = getDb();

  let query = `
    SELECT 
      cr.id AS request_id,
      cr.attendance_record_id,
      cr.original_status,
      cr.requested_status,
      cr.student_reason,
      cr.evidence_text,
      cr.status,
      cr.decision_reason,
      cr.decision_timestamp,
      cr.created_at AS submitted_at,
      u.id AS student_id,
      u.name AS student_name,
      u.roll_number,
      u.email AS student_email,
      ses.date AS lecture_date,
      ses.topic AS lecture_topic,
      sub.id AS subject_id,
      sub.code AS subject_code,
      sub.name AS subject_name,
      sub.faculty_id,
      rev.name AS reviewer_name
    FROM attendance_correction_requests cr
    JOIN users u ON cr.student_id = u.id
    JOIN attendance_records ar ON cr.attendance_record_id = ar.id
    JOIN attendance_sessions ses ON ar.session_id = ses.id
    JOIN subjects sub ON ses.subject_id = sub.id
    LEFT JOIN users rev ON cr.reviewer_id = rev.id
    WHERE 1=1
  `;
  const params = [];

  // Scoped authorization: faculty can only view requests for subjects they teach (unless admin)
  if (req.user.role !== 'admin') {
    query += ` AND sub.faculty_id = ?`;
    params.push(facultyId);
  }

  if (status && status !== 'All') {
    query += ` AND cr.status = ?`;
    params.push(status);
  }

  if (subjectId) {
    query += ` AND sub.id = ?`;
    params.push(subjectId);
  }

  query += ` ORDER BY CASE WHEN cr.status = 'Pending' THEN 0 ELSE 1 END, cr.created_at DESC`;
  const requests = db.query(query, params);

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  res.json({
    pendingCount,
    requests
  });
});

// POST /api/corrections/:id/approve — Faculty approves correction request
router.post('/:id/approve', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  const { decision_reason } = req.body;
  const facultyId = req.user.id;

  if (!decision_reason || !decision_reason.trim()) {
    return res.status(400).json({ error: 'A valid decision_reason is required to approve an attendance dispute' });
  }

  const db = getDb();

  // 1. Fetch request with subject scope information
  const request = db.get(`
    SELECT 
      cr.*,
      ar.id AS actual_record_id,
      ar.status AS current_attendance_status,
      ses.subject_id,
      sub.faculty_id AS course_faculty_id,
      sub.code AS subject_code
    FROM attendance_correction_requests cr
    JOIN attendance_records ar ON cr.attendance_record_id = ar.id
    JOIN attendance_sessions ses ON ar.session_id = ses.id
    JOIN subjects sub ON ses.subject_id = sub.id
    WHERE cr.id = ?
  `, [requestId]);

  if (!request) {
    return res.status(404).json({ error: 'Correction request not found' });
  }

  // State check: cannot re-decide already resolved request
  if (request.status !== 'Pending') {
    return res.status(400).json({ error: `Cannot approve request with status '${request.status}'. Only pending requests can be decided.` });
  }

  // Scope check: Faculty must be assigned to this subject (unless admin)
  if (req.user.role !== 'admin' && request.course_faculty_id !== facultyId) {
    return res.status(403).json({ error: 'Access denied: You are not authorized to decide requests for subject ' + request.subject_code });
  }

  const now = new Date().toISOString();

  try {
    // Database transaction / atomic update:
    // 1. Update official attendance record
    db.run(`
      UPDATE attendance_records
      SET status = ?, remarks = ?
      WHERE id = ?
    `, [
      request.requested_status,
      `Corrected per dispute #${request.id}: ${decision_reason.trim()}`,
      request.attendance_record_id
    ]);

    // 2. Update correction request record
    db.run(`
      UPDATE attendance_correction_requests
      SET status = 'Approved',
          reviewer_id = ?,
          decision_reason = ?,
          decision_timestamp = ?,
          updated_at = ?
      WHERE id = ?
    `, [facultyId, decision_reason.trim(), now, now, requestId]);

    // 3. Append immutable audit event
    db.run(`
      INSERT INTO attendance_audit_events (
        attendance_record_id, request_id, acting_user_id, acting_role,
        event_type, previous_status, new_status, reason
      ) VALUES (?, ?, ?, 'faculty', 'CORRECTION_APPROVED', ?, ?, ?)
    `, [
      request.attendance_record_id,
      requestId,
      facultyId,
      request.current_attendance_status,
      request.requested_status,
      decision_reason.trim()
    ]);

    res.json({
      message: 'Correction request approved and official attendance updated successfully',
      requestId,
      attendance_record_id: request.attendance_record_id,
      previous_status: request.current_attendance_status,
      new_status: request.requested_status,
      decision_timestamp: now
    });
  } catch (err) {
    console.error('Error approving correction request:', err);
    res.status(500).json({ error: 'Failed to approve request', details: err.message });
  }
});

// POST /api/corrections/:id/reject — Faculty rejects correction request
router.post('/:id/reject', authenticateToken, requireRole('faculty', 'admin'), (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  const { decision_reason } = req.body;
  const facultyId = req.user.id;

  if (!decision_reason || !decision_reason.trim()) {
    return res.status(400).json({ error: 'A valid decision_reason is required to reject an attendance dispute' });
  }

  const db = getDb();

  const request = db.get(`
    SELECT 
      cr.*,
      ar.status AS current_attendance_status,
      sub.faculty_id AS course_faculty_id,
      sub.code AS subject_code
    FROM attendance_correction_requests cr
    JOIN attendance_records ar ON cr.attendance_record_id = ar.id
    JOIN attendance_sessions ses ON ar.session_id = ses.id
    JOIN subjects sub ON ses.subject_id = sub.id
    WHERE cr.id = ?
  `, [requestId]);

  if (!request) {
    return res.status(404).json({ error: 'Correction request not found' });
  }

  if (request.status !== 'Pending') {
    return res.status(400).json({ error: `Cannot reject request with status '${request.status}'. Only pending requests can be decided.` });
  }

  if (req.user.role !== 'admin' && request.course_faculty_id !== facultyId) {
    return res.status(403).json({ error: 'Access denied: You are not authorized to decide requests for subject ' + request.subject_code });
  }

  const now = new Date().toISOString();

  try {
    // 1. Update correction request record (official attendance record stays untouched!)
    db.run(`
      UPDATE attendance_correction_requests
      SET status = 'Rejected',
          reviewer_id = ?,
          decision_reason = ?,
          decision_timestamp = ?,
          updated_at = ?
      WHERE id = ?
    `, [facultyId, decision_reason.trim(), now, now, requestId]);

    // 2. Append immutable audit event
    db.run(`
      INSERT INTO attendance_audit_events (
        attendance_record_id, request_id, acting_user_id, acting_role,
        event_type, previous_status, new_status, reason
      ) VALUES (?, ?, ?, 'faculty', 'CORRECTION_REJECTED', ?, ?, ?)
    `, [
      request.attendance_record_id,
      requestId,
      facultyId,
      request.current_attendance_status,
      request.current_attendance_status, // Status stays the same
      decision_reason.trim()
    ]);

    res.json({
      message: 'Correction request rejected. Official attendance record was preserved unchanged.',
      requestId,
      official_status: request.current_attendance_status,
      decision_timestamp: now
    });
  } catch (err) {
    console.error('Error rejecting correction request:', err);
    res.status(500).json({ error: 'Failed to reject request', details: err.message });
  }
});

// POST /api/corrections/:id/withdraw — Student withdraws pending request
router.post('/:id/withdraw', authenticateToken, requireRole('student'), (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  const studentId = req.user.id;
  const db = getDb();

  const request = db.get('SELECT * FROM attendance_correction_requests WHERE id = ?', [requestId]);
  if (!request) {
    return res.status(404).json({ error: 'Correction request not found' });
  }

  if (request.student_id !== studentId) {
    return res.status(403).json({ error: 'Access denied: You can only withdraw your own requests' });
  }

  if (request.status !== 'Pending') {
    return res.status(400).json({ error: `Cannot withdraw request with status '${request.status}'` });
  }

  const now = new Date().toISOString();

  db.run(`
    UPDATE attendance_correction_requests
    SET status = 'Withdrawn', updated_at = ?
    WHERE id = ?
  `, [now, requestId]);

  db.run(`
    INSERT INTO attendance_audit_events (
      attendance_record_id, request_id, acting_user_id, acting_role,
      event_type, previous_status, new_status, reason
    ) VALUES (?, ?, ?, 'student', 'CORRECTION_WITHDRAWN', ?, ?, 'Withdrawn by student')
  `, [request.attendance_record_id, requestId, studentId, request.original_status, request.original_status]);

  res.json({ message: 'Request withdrawn successfully' });
});

// GET /api/corrections/audit/:recordId — Audit history for an attendance record
router.get('/audit/:recordId', authenticateToken, (req, res) => {
  const recordId = parseInt(req.params.recordId, 10);
  const db = getDb();

  // If student, check they own the record
  if (req.user.role === 'student') {
    const check = db.get('SELECT student_id FROM attendance_records WHERE id = ?', [recordId]);
    if (!check || check.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to audit trail' });
    }
  }

  const events = db.query(`
    SELECT 
      ae.*,
      u.name AS acting_user_name
    FROM attendance_audit_events ae
    LEFT JOIN users u ON ae.acting_user_id = u.id
    WHERE ae.attendance_record_id = ?
    ORDER BY ae.created_at ASC
  `, [recordId]);

  res.json({ recordId, events });
});

module.exports = router;
