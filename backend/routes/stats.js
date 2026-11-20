const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Helper to determine letter grade and grade points
function getGrade(percentage) {
  if (percentage >= 90) return { grade: 'A+', points: 10, label: 'Outstanding' };
  if (percentage >= 80) return { grade: 'A', points: 9, label: 'Excellent' };
  if (percentage >= 70) return { grade: 'B+', points: 8, label: 'Very Good' };
  if (percentage >= 60) return { grade: 'B', points: 7, label: 'Good' };
  if (percentage >= 50) return { grade: 'C', points: 6, label: 'Above Average' };
  if (percentage >= 40) return { grade: 'P', points: 5, label: 'Pass' };
  return { grade: 'F', points: 0, label: 'Needs Remedial Support' };
}

// GET /api/stats/student-dashboard or /api/stats/student
router.get(['/student-dashboard', '/student'], authenticateToken, (req, res) => {
  const db = getDb();
  let studentId = req.user.id;

  // If faculty or admin passes ?studentId=X, allow them to view that student's dashboard
  if ((req.user.role === 'faculty' || req.user.role === 'admin') && req.query.studentId) {
    studentId = parseInt(req.query.studentId, 10);
  }

  const student = db.get(`
    SELECT u.id, u.name, u.email, u.roll_number, u.department, s.name as section_name
    FROM users u
    LEFT JOIN student_sections ss ON u.id = ss.student_id
    LEFT JOIN sections s ON ss.section_id = s.id
    WHERE u.id = ?
  `, [studentId]);

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Get enrolled subjects
  const subjects = db.query(`
    SELECT sub.*, u.name AS faculty_name
    FROM subjects sub
    JOIN student_subjects ss ON sub.id = ss.subject_id
    LEFT JOIN users u ON sub.faculty_id = u.id
    WHERE ss.student_id = ?
    ORDER BY sub.code ASC
  `, [studentId]);

  let totalClassesConducted = 0;
  let totalAttendedCount = 0;
  let subjectStats = [];
  let alerts = [];
  let totalCredits = 0;
  let totalGradePoints = 0;

  for (const sub of subjects) {
    const threshold = sub.attendance_threshold || 75.0;

    // Attendance stats for this subject
    const attRow = db.get(`
      SELECT 
        COUNT(ses.id) AS total_sessions,
        SUM(CASE WHEN ar.status = 'Present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN ar.status = 'Late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN ar.status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN ar.status = 'Excused' THEN 1 ELSE 0 END) AS excused_count
      FROM attendance_sessions ses
      LEFT JOIN attendance_records ar ON ses.id = ar.session_id AND ar.student_id = ?
      WHERE ses.subject_id = ?
    `, [studentId, sub.id]) || { total_sessions: 0, present_count: 0, late_count: 0, absent_count: 0, excused_count: 0 };

    const totalSessions = attRow.total_sessions || 0;
    const present = attRow.present_count || 0;
    const late = attRow.late_count || 0;
    const absent = attRow.absent_count || 0;
    const excused = attRow.excused_count || 0;
    const effectiveAttended = present + (late * 0.5) + excused;
    const attPercentage = totalSessions > 0 ? Math.round((effectiveAttended / totalSessions) * 100 * 10) / 10 : 100;

    totalClassesConducted += totalSessions;
    totalAttendedCount += effectiveAttended;

    const plannedClasses = sub.total_classes_planned || 40;
    const remainingClasses = Math.max(0, plannedClasses - totalSessions);
    const maxAchievablePercentage = (totalSessions + remainingClasses) > 0 
      ? Math.round(((effectiveAttended + remainingClasses) / (totalSessions + remainingClasses)) * 100 * 10) / 10 
      : attPercentage;

    // Calculate how many more classes need to be attended if attendance < threshold
    let classesToAttend = 0;
    let recoveryStatus = 'TARGET_ACHIEVED';
    const isAtRisk = attPercentage < threshold && totalSessions > 0;

    if (isAtRisk) {
      const p = threshold / 100.0;
      // Formula: n = ceil((p * T - A) / (1 - p))
      classesToAttend = Math.ceil((p * totalSessions - effectiveAttended) / (1 - p));
      if (classesToAttend < 0) classesToAttend = 0;

      // Verify inequality: (A + n)/(T + n) >= p
      while ((effectiveAttended + classesToAttend) / (totalSessions + classesToAttend) < (p - 1e-6)) {
        classesToAttend++;
      }

      if (remainingClasses <= 0) {
        recoveryStatus = 'NO_CLASSES_REMAINING';
      } else if (classesToAttend > remainingClasses) {
        recoveryStatus = 'MATHEMATICALLY_UNATTAINABLE';
      } else if (classesToAttend === remainingClasses) {
        recoveryStatus = 'RECOVERABLE_ALL_REQUIRED';
      } else {
        recoveryStatus = 'RECOVERABLE';
      }

      let recommendationText = '';
      if (recoveryStatus === 'MATHEMATICALLY_UNATTAINABLE') {
        recommendationText = `Target unreachable within planned ${remainingClasses} remaining lectures (Max achievable: ${maxAchievablePercentage}%). Submit medical/activity leave dispute or contact dean.`;
      } else if (recoveryStatus === 'RECOVERABLE_ALL_REQUIRED') {
        recommendationText = `Critical: Must attend EVERY single remaining lecture (${remainingClasses} classes) without missing any to reach 75%.`;
      } else {
        recommendationText = `Attend the next ${classesToAttend} consecutive lectures without absence to restore eligibility to ${threshold}%.`;
      }

      alerts.push({
        type: 'attendance_warning',
        severity: attPercentage < 65 || recoveryStatus === 'MATHEMATICALLY_UNATTAINABLE' ? 'critical' : 'warning',
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        currentPercentage: attPercentage,
        threshold,
        classesToAttend,
        remainingClasses,
        maxAchievablePercentage,
        recoveryStatus,
        reason: `Attendance of ${attPercentage}% has dropped below mandatory institution threshold of ${threshold}%.`,
        supportingData: `Attended: ${effectiveAttended} of ${totalSessions} sessions (${absent} absences, ${late} late). Remaining planned: ${remainingClasses}.`,
        thresholdRule: `University Regulation: Minimum ${threshold}% attendance required for semester exam eligibility.`,
        recommendation: recommendationText,
        provenance: 'Operational Institutional Attendance Records',
        message: `Low attendance in ${sub.code} (${attPercentage}%). ${recommendationText}`
      });
    }

    // Assessments and marks for this subject
    const assessments = db.query(`
      SELECT 
        a.id AS assessment_id,
        a.title,
        a.type,
        a.max_marks,
        a.weightage,
        a.date,
        m.marks_obtained,
        m.remarks,
        (SELECT AVG(marks_obtained) FROM marks WHERE assessment_id = a.id) as class_avg
      FROM assessments a
      LEFT JOIN marks m ON a.id = m.assessment_id AND m.student_id = ?
      WHERE a.subject_id = ?
      ORDER BY a.date ASC
    `, [studentId, sub.id]);

    let subjectMarksObtained = 0;
    let subjectMaxMarks = 0;
    let weightedScore = 0;
    let totalWeightage = 0;

    assessments.forEach(ass => {
      if (ass.marks_obtained !== null && ass.marks_obtained !== undefined) {
        subjectMarksObtained += ass.marks_obtained;
        subjectMaxMarks += ass.max_marks;
        if (ass.max_marks > 0) {
          weightedScore += (ass.marks_obtained / ass.max_marks) * (ass.weightage || 0);
          totalWeightage += (ass.weightage || 0);

          const scorePercent = (ass.marks_obtained / ass.max_marks) * 100;
          if (scorePercent < 50) {
            alerts.push({
              type: 'academic_alert',
              severity: 'warning',
              subjectId: sub.id,
              subjectCode: sub.code,
              subjectName: sub.name,
              assessmentTitle: ass.title,
              score: ass.marks_obtained,
              maxMarks: ass.max_marks,
              scorePercent: Math.round(scorePercent),
              reason: `Scored ${ass.marks_obtained}/${ass.max_marks} (${Math.round(scorePercent)}%), falling below 50% internal competency benchmark.`,
              supportingData: `Component: ${ass.title} (${ass.type}). Class average: ${ass.class_avg ? Math.round(ass.class_avg * 10) / 10 : 'N/A'}/${ass.max_marks}.`,
              thresholdRule: 'Internal Assessment Standard: Scores < 50% trigger academic guidance alert.',
              recommendation: `Schedule faculty consultation with ${sub.faculty_name || 'instructor'} and complete revision tutorial.`,
              provenance: 'Operational Internal Assessment Records',
              message: `Academic support suggested: Scored ${ass.marks_obtained}/${ass.max_marks} (${Math.round(scorePercent)}%) in ${ass.title} (${sub.code}).`
            });
          }
        }
      }
    });

    const marksPercentage = subjectMaxMarks > 0 ? Math.round((subjectMarksObtained / subjectMaxMarks) * 100 * 10) / 10 : 0;
    const internalPercentage = totalWeightage > 0 ? Math.round((weightedScore / totalWeightage) * 100 * 10) / 10 : marksPercentage;
    const gradeInfo = getGrade(internalPercentage > 0 ? internalPercentage : marksPercentage);

    totalCredits += (sub.credits || 3);
    totalGradePoints += (gradeInfo.points * (sub.credits || 3));

    // Pending correction count for this subject
    const pendingCorrRow = db.get(`
      SELECT COUNT(cr.id) AS count
      FROM attendance_correction_requests cr
      JOIN attendance_records ar ON cr.attendance_record_id = ar.id
      JOIN attendance_sessions ses ON ar.session_id = ses.id
      WHERE cr.student_id = ? AND ses.subject_id = ? AND cr.status = 'Pending'
    `, [studentId, sub.id]);

    subjectStats.push({
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      credits: sub.credits || 3,
      facultyName: sub.faculty_name,
      plannedClasses,
      remainingClasses,
      maxAchievablePercentage,
      recoveryStatus,
      pendingCorrectionsCount: pendingCorrRow ? pendingCorrRow.count : 0,
      attendance: {
        totalSessions,
        present,
        late,
        absent,
        excused,
        effectiveAttended,
        percentage: attPercentage,
        threshold,
        isAtRisk,
        classesToAttend,
        remainingClasses,
        maxAchievablePercentage,
        recoveryStatus
      },
      academics: {
        marksObtained: subjectMarksObtained,
        maxMarks: subjectMaxMarks,
        marksPercentage,
        internalPercentage,
        grade: gradeInfo.grade,
        points: gradeInfo.points,
        label: gradeInfo.label,
        assessments
      }
    });
  }

  const overallAttendancePercentage = totalClassesConducted > 0
    ? Math.round((totalAttendedCount / totalClassesConducted) * 100 * 10) / 10
    : 100;

  const cgpa = totalCredits > 0
    ? Math.round((totalGradePoints / totalCredits) * 100) / 100
    : 0.0;

  // Attendance timeline for chart (all recent sessions attended vs missed)
  const timeline = db.query(`
    SELECT ses.date, ar.status, sub.code as subject_code
    FROM attendance_records ar
    JOIN attendance_sessions ses ON ar.session_id = ses.id
    JOIN subjects sub ON ses.subject_id = sub.id
    WHERE ar.student_id = ?
    ORDER BY ses.date ASC
  `, [studentId]);

  res.json({
    student,
    summary: {
      overallAttendancePercentage,
      totalClassesConducted,
      totalAttendedCount,
      cgpa,
      enrolledSubjectsCount: subjects.length,
      alertsCount: alerts.length,
      isOverallAtRisk: overallAttendancePercentage < 75.0
    },
    alerts,
    subjectStats,
    timeline
  });
});

// GET /api/stats/faculty-dashboard or /api/stats/faculty
router.get(['/faculty-dashboard', '/faculty'], authenticateToken, (req, res) => {
  const db = getDb();
  const facultyId = req.user.id;

  // Subjects taught by this faculty
  const subjects = db.query(`
    SELECT s.*, sec.name as section_name
    FROM subjects s
    LEFT JOIN sections sec ON s.section_id = sec.id
    WHERE s.faculty_id = ?
    ORDER BY s.code ASC
  `, [facultyId]);

  const subjectIds = subjects.map(s => s.id);
  let totalStudents = 0;
  let totalSessions = 0;
  let atRiskStudents = [];
  let subjectAnalytics = [];

  if (subjectIds.length > 0) {
    // Unique students across faculty's subjects
    const uniqueStudents = db.get(`
      SELECT COUNT(DISTINCT student_id) AS count
      FROM student_subjects
      WHERE subject_id IN (${subjectIds.map(() => '?').join(',')})
    `, subjectIds);
    totalStudents = uniqueStudents ? uniqueStudents.count : 0;

    // Total sessions taken
    const sessionsRow = db.get(`
      SELECT COUNT(*) AS count
      FROM attendance_sessions
      WHERE faculty_id = ?
    `, [facultyId]);
    totalSessions = sessionsRow ? sessionsRow.count : 0;

    // Subject breakdown
    for (const sub of subjects) {
      const sesCount = db.get('SELECT COUNT(*) as c FROM attendance_sessions WHERE subject_id = ?', [sub.id]).c;
      const enrolled = db.get('SELECT COUNT(*) as c FROM student_subjects WHERE subject_id = ?', [sub.id]).c;

      // Class average attendance %
      const attAvg = db.get(`
        SELECT 
          COUNT(ar.id) as total_marks,
          SUM(CASE WHEN ar.status = 'Present' THEN 1 WHEN ar.status = 'Late' THEN 0.5 ELSE 0 END) as attended
        FROM attendance_records ar
        JOIN attendance_sessions ses ON ar.session_id = ses.id
        WHERE ses.subject_id = ?
      `, [sub.id]);

      const avgAttPercent = attAvg && attAvg.total_marks > 0 
        ? Math.round((attAvg.attended / attAvg.total_marks) * 100 * 10) / 10 
        : 100;

      // Class average assessment score %
      const marksAvg = db.get(`
        SELECT 
          AVG((m.marks_obtained / a.max_marks) * 100) AS avg_score
        FROM marks m
        JOIN assessments a ON m.assessment_id = a.id
        WHERE a.subject_id = ?
      `, [sub.id]);

      const avgMarksPercent = marksAvg && marksAvg.avg_score !== null 
        ? Math.round(marksAvg.avg_score * 10) / 10 
        : 0;

      // Find at-risk students (< 75% attendance)
      const studentsInSub = db.query(`
        SELECT u.id, u.name, u.email, u.roll_number
        FROM users u
        JOIN student_subjects ss ON u.id = ss.student_id
        WHERE ss.subject_id = ?
      `, [sub.id]);

      for (const st of studentsInSub) {
        const studentAtt = db.get(`
          SELECT 
            COUNT(ses.id) as total,
            SUM(CASE WHEN ar.status = 'Present' THEN 1 WHEN ar.status = 'Late' THEN 0.5 ELSE 0 END) as attended
          FROM attendance_sessions ses
          LEFT JOIN attendance_records ar ON ses.id = ar.session_id AND ar.student_id = ?
          WHERE ses.subject_id = ?
        `, [st.id, sub.id]);

        const totalSes = studentAtt ? studentAtt.total : 0;
        const attendedSes = studentAtt ? (studentAtt.attended || 0) : 0;
        const perc = totalSes > 0 ? Math.round((attendedSes / totalSes) * 100 * 10) / 10 : 100;

        if (totalSes > 0 && perc < (sub.attendance_threshold || 75.0)) {
          atRiskStudents.push({
            studentId: st.id,
            name: st.name,
            rollNumber: st.roll_number,
            email: st.email,
            subjectCode: sub.code,
            subjectName: sub.name,
            attendancePercentage: perc,
            threshold: sub.attendance_threshold || 75.0,
            classesAttended: attendedSes,
            totalClasses: totalSes
          });
        }
      }

      subjectAnalytics.push({
        subjectId: sub.id,
        code: sub.code,
        name: sub.name,
        sectionName: sub.section_name,
        enrolledCount: enrolled,
        sessionsCount: sesCount,
        avgAttendancePercentage: avgAttPercent,
        avgMarksPercentage: avgMarksPercent
      });
    }
  }

  // Recent 5 attendance sessions
  const recentSessions = db.query(`
    SELECT ses.id, ses.date, ses.topic, sub.code as subject_code, sub.name as subject_name,
      COUNT(ar.id) as total_students,
      SUM(CASE WHEN ar.status = 'Present' THEN 1 ELSE 0 END) as present_count
    FROM attendance_sessions ses
    JOIN subjects sub ON ses.subject_id = sub.id
    LEFT JOIN attendance_records ar ON ses.id = ar.session_id
    WHERE ses.faculty_id = ?
    GROUP BY ses.id
    ORDER BY ses.date DESC, ses.id DESC
    LIMIT 5
  `, [facultyId]);

  // Pending correction dispute requests for this faculty's subjects
  let pendingCorrections = [];
  let pendingCorrectionsCount = 0;

  if (subjectIds.length > 0) {
    const placeholders = subjectIds.map(() => '?').join(',');
    const pendingRows = db.query(`
      SELECT 
        cr.id AS request_id,
        cr.attendance_record_id,
        cr.original_status,
        cr.requested_status,
        cr.student_reason,
        cr.created_at,
        u.name AS student_name,
        u.roll_number,
        sub.code AS subject_code,
        sub.name AS subject_name,
        ses.date AS lecture_date
      FROM attendance_correction_requests cr
      JOIN users u ON cr.student_id = u.id
      JOIN attendance_records ar ON cr.attendance_record_id = ar.id
      JOIN attendance_sessions ses ON ar.session_id = ses.id
      JOIN subjects sub ON ses.subject_id = sub.id
      WHERE cr.status = 'Pending' AND sub.id IN (${placeholders})
      ORDER BY cr.created_at ASC
    `, subjectIds);

    pendingCorrections = pendingRows;
    pendingCorrectionsCount = pendingRows.length;
  }

  res.json({
    summary: {
      totalSubjects: subjects.length,
      totalStudents,
      totalSessions,
      atRiskStudentsCount: atRiskStudents.length,
      pendingCorrectionsCount
    },
    subjects: subjectAnalytics,
    atRiskStudents,
    recentSessions,
    pendingCorrections
  });
});

module.exports = router;
