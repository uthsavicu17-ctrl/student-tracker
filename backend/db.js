const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'database.sqlite');
let dbInstance = null;

// Helper to convert sql.js statement results to array of plain JS objects
function stmtToObjects(stmt) {
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Save database to disk
function saveToDisk() {
  if (dbInstance) {
    try {
      const data = dbInstance.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
      dbInstance.run('PRAGMA foreign_keys = ON;');
    } catch (err) {
      console.error('Failed to save database to disk:', err);
    }
  }
}

// Database wrapper API
const db = {
  query(sql, params = []) {
    try {
      const stmt = dbInstance.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      return stmtToObjects(stmt);
    } catch (err) {
      console.error('Database query error:', sql, params, err);
      throw err;
    }
  },

  get(sql, params = []) {
    try {
      const stmt = dbInstance.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return null;
    } catch (err) {
      console.error('Database get error:', sql, params, err);
      throw err;
    }
  },

  run(sql, params = []) {
    try {
      if (params && params.length > 0) {
        const stmt = dbInstance.prepare(sql);
        stmt.run(params);
        stmt.free();
      } else {
        dbInstance.run(sql);
      }
      // Get last insert ID and changes
      const lastIdRes = dbInstance.exec("SELECT last_insert_rowid() AS id;");
      const lastInsertRowid = lastIdRes.length && lastIdRes[0].values.length ? lastIdRes[0].values[0][0] : 0;
      
      const changesRes = dbInstance.exec("SELECT changes() AS ch;");
      const changes = changesRes.length && changesRes[0].values.length ? changesRes[0].values[0][0] : 0;

      saveToDisk();
      return { lastInsertRowid, changes };
    } catch (err) {
      console.error('Database run error:', sql, params, err);
      throw err;
    }
  },

  exec(sql) {
    try {
      dbInstance.exec(sql);
      saveToDisk();
    } catch (err) {
      console.error('Database exec error:', err);
      throw err;
    }
  },

  save() {
    saveToDisk();
  }
};

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      console.log('Loaded existing database from database.sqlite');
    } catch (e) {
      console.warn('Could not read existing database, creating fresh one:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
    console.log('Creating new in-memory SQLite database');
  }

  dbInstance.exec('PRAGMA foreign_keys = ON;');

  createTablesAndSeed();
  dbInstance.run('PRAGMA foreign_keys = ON;');
  return db;
}

function createTablesAndSeed() {
  dbInstance.run('PRAGMA foreign_keys = ON;');

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('faculty', 'student', 'admin')),
      roll_number TEXT,
      department TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      semester INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      department TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      faculty_id INTEGER REFERENCES users(id),
      section_id INTEGER REFERENCES sections(id),
      total_classes_planned INTEGER DEFAULT 45,
      attendance_threshold REAL DEFAULT 75.0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      section_id INTEGER NOT NULL REFERENCES sections(id),
      UNIQUE(student_id, section_id)
    );

    CREATE TABLE IF NOT EXISTS student_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      UNIQUE(student_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      date TEXT NOT NULL,
      faculty_id INTEGER REFERENCES users(id),
      topic TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Late', 'Excused')),
      remarks TEXT,
      UNIQUE(session_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      title TEXT NOT NULL,
      type TEXT DEFAULT 'Internal Exam',
      max_marks REAL NOT NULL,
      weightage REAL DEFAULT 20.0,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id),
      marks_obtained REAL NOT NULL,
      remarks TEXT,
      UNIQUE(assessment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS uci_datasets_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      source_url TEXT NOT NULL,
      license TEXT NOT NULL,
      download_date TEXT NOT NULL,
      description TEXT,
      total_records INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uci_student_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_file TEXT NOT NULL,
      source_row_index INTEGER NOT NULL,
      subject TEXT NOT NULL,
      student_composite_id TEXT NOT NULL,
      school TEXT NOT NULL,
      sex TEXT NOT NULL,
      age INTEGER NOT NULL,
      address TEXT NOT NULL,
      famsize TEXT NOT NULL,
      pstatus TEXT NOT NULL,
      medu INTEGER NOT NULL,
      fedu INTEGER NOT NULL,
      mjob TEXT NOT NULL,
      fjob TEXT NOT NULL,
      reason TEXT NOT NULL,
      guardian TEXT NOT NULL,
      traveltime INTEGER NOT NULL,
      studytime INTEGER NOT NULL,
      failures INTEGER NOT NULL,
      schoolsup TEXT NOT NULL,
      famsup TEXT NOT NULL,
      paid TEXT NOT NULL,
      activities TEXT NOT NULL,
      nursery TEXT NOT NULL,
      higher TEXT NOT NULL,
      internet TEXT NOT NULL,
      romantic TEXT NOT NULL,
      famrel INTEGER NOT NULL,
      freetime INTEGER NOT NULL,
      goout INTEGER NOT NULL,
      dalc INTEGER NOT NULL,
      walc INTEGER NOT NULL,
      health INTEGER NOT NULL,
      absences INTEGER NOT NULL,
      g1 INTEGER NOT NULL,
      g2 INTEGER NOT NULL,
      g3 INTEGER NOT NULL,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_file, source_row_index)
    );

    CREATE INDEX IF NOT EXISTS idx_uci_composite ON uci_student_records(student_composite_id);
    CREATE INDEX IF NOT EXISTS idx_uci_subject ON uci_student_records(subject);
    CREATE INDEX IF NOT EXISTS idx_uci_school ON uci_student_records(school);

    -- Attendance Dispute & Correction Requests
    CREATE TABLE IF NOT EXISTS attendance_correction_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_record_id INTEGER NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id),
      original_status TEXT NOT NULL CHECK(original_status IN ('Present', 'Late', 'Absent', 'Excused')),
      requested_status TEXT NOT NULL CHECK(requested_status IN ('Present', 'Late', 'Absent', 'Excused')),
      student_reason TEXT NOT NULL,
      evidence_text TEXT,
      status TEXT NOT NULL CHECK(status IN ('Pending', 'Approved', 'Rejected', 'Withdrawn')) DEFAULT 'Pending',
      reviewer_id INTEGER REFERENCES users(id),
      decision_reason TEXT,
      decision_timestamp DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_correction 
    ON attendance_correction_requests(attendance_record_id) 
    WHERE status = 'Pending';

    CREATE INDEX IF NOT EXISTS idx_corr_student ON attendance_correction_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_corr_status ON attendance_correction_requests(status);

    -- Append-Only Attendance Audit Log
    CREATE TABLE IF NOT EXISTS attendance_audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_record_id INTEGER NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
      request_id INTEGER REFERENCES attendance_correction_requests(id) ON DELETE SET NULL,
      acting_user_id INTEGER NOT NULL REFERENCES users(id),
      acting_role TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('CORRECTION_REQUESTED', 'CORRECTION_APPROVED', 'CORRECTION_REJECTED', 'CORRECTION_WITHDRAWN', 'OFFICIAL_ATTENDANCE_RECORDED', 'ATTENDANCE_UPDATED')),
      previous_status TEXT,
      new_status TEXT,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_record ON attendance_audit_events(attendance_record_id);
    CREATE INDEX IF NOT EXISTS idx_audit_request ON attendance_audit_events(request_id);

  `);

  // Check if users already seeded
  const userCount = db.get("SELECT COUNT(*) AS count FROM users;");
  if (!userCount || userCount.count === 0) {
    console.log('Seeding initial educational records...');
    seedSampleData();
  }

  saveToDisk();
}

function seedSampleData() {
  const passwordHash = bcrypt.hashSync('password123', 8);

  // 1. Insert Faculty
  db.run(`
    INSERT INTO users (name, email, password, role, department)
    VALUES 
      ('Prof. Rajesh Sharma', 'prof.sharma@college.edu', ?, 'faculty', 'Computer Science & Engineering'),
      ('Dr. Anita Desai', 'dr.anita@college.edu', ?, 'faculty', 'Information Technology'),
      ('Academic Admin', 'admin@college.edu', ?, 'admin', 'Academic Dean Office')
  `, [passwordHash, passwordHash, passwordHash]);

  // 2. Insert Students
  const students = [
    { name: 'Aarav Patel', email: 'aarav.patel@student.edu', roll: '2024CS101', dept: 'CSE' },
    { name: 'Priya Singh', email: 'priya.singh@student.edu', roll: '2024CS102', dept: 'CSE' },
    { name: 'Rahul Verma', email: 'rahul.verma@student.edu', roll: '2024CS103', dept: 'CSE' }, // Low attendance demo (<70%)
    { name: 'Sneha Reddy', email: 'sneha.reddy@student.edu', roll: '2024CS104', dept: 'CSE' },
    { name: 'Vikram Mehta', email: 'vikram.mehta@student.edu', roll: '2024CS105', dept: 'CSE' }, // Borderline attendance demo (73%)
    { name: 'Ananya Iyer', email: 'ananya.iyer@student.edu', roll: '2024CS106', dept: 'CSE' },
    { name: 'Karan Malhotra', email: 'karan.malhotra@student.edu', roll: '2024CS107', dept: 'CSE' },
    { name: 'Divya Joshi', email: 'divya.joshi@student.edu', roll: '2024CS108', dept: 'CSE' },
    { name: 'Rohit Kapoor', email: 'rohit.kapoor@student.edu', roll: '2024CS109', dept: 'CSE' },
    { name: 'Pooja Nair', email: 'pooja.nair@student.edu', roll: '2024CS110', dept: 'CSE' }
  ];

  for (const s of students) {
    db.run(`
      INSERT INTO users (name, email, password, role, roll_number, department)
      VALUES (?, ?, ?, 'student', ?, ?)
    `, [s.name, s.email, passwordHash, s.roll, s.dept]);
  }

  // 3. Insert Sections
  db.run(`
    INSERT INTO sections (name, semester, academic_year, department)
    VALUES 
      ('CSE - Section A', 5, '2025-2026', 'Computer Science & Engineering'),
      ('CSE - Section B', 5, '2025-2026', 'Computer Science & Engineering'),
      ('IT - Section A', 5, '2025-2026', 'Information Technology')
  `);

  // Enroll students into Section 1 (CSE - Section A)
  const studentRows = db.query("SELECT id FROM users WHERE role = 'student'");
  for (const s of studentRows) {
    db.run("INSERT INTO student_sections (student_id, section_id) VALUES (?, 1)", [s.id]);
  }

  // 4. Insert Subjects (Faculty 1 = Prof. Sharma, Faculty 2 = Dr. Desai)
  db.run(`
    INSERT INTO subjects (code, name, credits, faculty_id, section_id, total_classes_planned, attendance_threshold, description)
    VALUES 
      ('CS501', 'Database Management Systems', 4, 1, 1, 40, 75.0, 'Relational models, SQL, Normalization, Query optimization and transactions.'),
      ('CS502', 'Operating Systems', 4, 1, 1, 42, 75.0, 'Process scheduling, Concurrency, Virtual Memory, and File Systems.'),
      ('CS503', 'Computer Networks', 3, 2, 1, 38, 75.0, 'OSI stack, TCP/IP protocols, Routing algorithms, and Network Security.'),
      ('CS504', 'Machine Learning & AI', 3, 1, 1, 36, 75.0, 'Supervised & unsupervised learning, Neural networks, Model evaluation.')
  `);

  // Enroll students in subjects 1, 2, 3, 4
  const subjectRows = db.query("SELECT id FROM subjects");
  for (const s of studentRows) {
    for (const sub of subjectRows) {
      db.run("INSERT INTO student_subjects (student_id, subject_id) VALUES (?, ?)", [s.id, sub.id]);
    }
  }

  // 5. Seed Attendance Sessions and Records for CS501 (DBMS)
  // Let's create 12 sessions across recent weeks
  const dbmsSessions = [
    { date: '2026-10-01', topic: 'Course Overview & Intro to DBMS' },
    { date: '2026-10-03', topic: 'Entity-Relationship (ER) Modeling' },
    { date: '2026-10-06', topic: 'Relational Algebra & Schema Design' },
    { date: '2026-10-08', topic: 'Advanced SQL: Joins and Subqueries' },
    { date: '2026-10-10', topic: 'Functional Dependencies & Keys' },
    { date: '2026-10-13', topic: 'First & Second Normal Forms (1NF, 2NF)' },
    { date: '2026-10-15', topic: 'Third Normal Form (3NF) & BCNF' },
    { date: '2026-10-17', topic: 'Transaction Concepts & ACID Properties' },
    { date: '2026-10-20', topic: 'Concurrency Control & 2PL' },
    { date: '2026-10-22', topic: 'Indexing Techniques & B+ Trees' },
    { date: '2026-10-23', topic: 'Database Crash Recovery & Logging' },
    { date: '2026-10-24', topic: 'NoSQL Databases & Distributed Systems' }
  ];

  for (let i = 0; i < dbmsSessions.length; i++) {
    const ses = dbmsSessions[i];
    const { lastInsertRowid: sessionId } = db.run(`
      INSERT INTO attendance_sessions (subject_id, date, faculty_id, topic)
      VALUES (1, ?, 1, ?)
    `, [ses.date, ses.topic]);

    for (const s of studentRows) {
      let status = 'Present';
      // Rahul Verma (id: 5 or 3) misses several classes to showcase low attendance alert (<70%)
      const isRahul = s.id === 5; // s.id 3 or check roll
      const isVikram = s.id === 7;
      
      // Let's look up roll to be exact
      const studentObj = db.get("SELECT roll_number FROM users WHERE id = ?", [s.id]);
      if (studentObj.roll_number === '2024CS103') { // Rahul Verma
        // Misses 5 out of 12 classes -> 7/12 = 58.3% attendance (Critical Alert!)
        if ([1, 3, 6, 8, 11].includes(i)) status = 'Absent';
      } else if (studentObj.roll_number === '2024CS105') { // Vikram Mehta
        // Misses 3 out of 12 classes -> 9/12 = 75.0% (Warning borderline)
        if ([2, 5, 9].includes(i)) status = 'Absent';
      } else if (studentObj.roll_number === '2024CS109') { // Rohit Kapoor
        // Misses 4 out of 12 classes -> 66.7%
        if ([0, 4, 7, 10].includes(i)) status = 'Absent';
      } else {
        // High attenders, occasionally late or 1 absence
        if (i === 4 && s.id % 2 === 0) status = 'Late';
        else if (i === 9 && s.id === 6) status = 'Absent';
        else status = 'Present';
      }

      db.run(`
        INSERT INTO attendance_records (session_id, student_id, status)
        VALUES (?, ?, ?)
      `, [sessionId, s.id, status]);
    }
  }

  // Also seed some sessions for Operating Systems (CS502)
  const osSessions = [
    { date: '2026-10-02', topic: 'OS Architecture & System Calls' },
    { date: '2026-10-05', topic: 'Process Management & Fork()' },
    { date: '2026-10-09', topic: 'CPU Scheduling Algorithms' },
    { date: '2026-10-12', topic: 'Process Synchronization & Semaphores' },
    { date: '2026-10-16', topic: 'Deadlock Detection & Prevention' },
    { date: '2026-10-19', topic: 'Virtual Memory & Page Replacement' },
    { date: '2026-10-21', topic: 'File System Implementation' }
  ];

  for (let i = 0; i < osSessions.length; i++) {
    const ses = osSessions[i];
    const { lastInsertRowid: sessionId } = db.run(`
      INSERT INTO attendance_sessions (subject_id, date, faculty_id, topic)
      VALUES (2, ?, 1, ?)
    `, [ses.date, ses.topic]);

    for (const s of studentRows) {
      const studentObj = db.get("SELECT roll_number FROM users WHERE id = ?", [s.id]);
      let status = 'Present';
      if (studentObj.roll_number === '2024CS103' && (i === 1 || i === 3 || i === 5)) {
        status = 'Absent';
      } else if (studentObj.roll_number === '2024CS105' && i === 4) {
        status = 'Absent';
      }
      db.run("INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)", [sessionId, s.id, status]);
    }
  }

  // 6. Seed Internal Assessments for CS501 (DBMS)
  const assessments = [
    { title: 'Quiz 1: Relational Algebra & ER', type: 'Quiz', max_marks: 20, weightage: 15, date: '2026-10-09' },
    { title: 'Internal Assessment Test 1 (Midterm)', type: 'Internal Exam', max_marks: 50, weightage: 35, date: '2026-10-16' },
    { title: 'Assignment 1: SQL Complex Queries', type: 'Assignment', max_marks: 25, weightage: 20, date: '2026-10-21' },
    { title: 'Database Lab Practical Test', type: 'Lab Practical', max_marks: 30, weightage: 30, date: '2026-10-23' }
  ];

  for (const a of assessments) {
    const { lastInsertRowid: assessId } = db.run(`
      INSERT INTO assessments (subject_id, title, type, max_marks, weightage, date)
      VALUES (1, ?, ?, ?, ?, ?)
    `, [a.title, a.type, a.max_marks, a.weightage, a.date]);

    // Insert student marks
    for (const s of studentRows) {
      const studentObj = db.get("SELECT roll_number FROM users WHERE id = ?", [s.id]);
      let score;
      if (studentObj.roll_number === '2024CS101') { // Aarav - Top student
        score = Math.round(a.max_marks * 0.94);
      } else if (studentObj.roll_number === '2024CS104') { // Sneha - High
        score = Math.round(a.max_marks * 0.92);
      } else if (studentObj.roll_number === '2024CS102') { // Priya
        score = Math.round(a.max_marks * 0.84);
      } else if (studentObj.roll_number === '2024CS103') { // Rahul - struggling
        score = Math.round(a.max_marks * 0.48); // < 50% triggers academic risk alert!
      } else if (studentObj.roll_number === '2024CS105') { // Vikram
        score = Math.round(a.max_marks * 0.68);
      } else {
        const factor = 0.65 + ((s.id * 7) % 25) / 100;
        score = Math.round(a.max_marks * factor);
      }

      db.run(`
        INSERT INTO marks (assessment_id, student_id, marks_obtained, remarks)
        VALUES (?, ?, ?, ?)
      `, [assessId, s.id, score, score < a.max_marks * 0.5 ? 'Needs improvement in core concepts' : 'Good performance']);
    }
  }

  // 7. Seed Assessments for CS502 (Operating Systems)
  const osAssessments = [
    { title: 'Quiz 1: CPU Scheduling', type: 'Quiz', max_marks: 20, weightage: 20, date: '2026-10-11' },
    { title: 'OS Midterm Assessment', type: 'Internal Exam', max_marks: 50, weightage: 40, date: '2026-10-22' }
  ];

  for (const a of osAssessments) {
    const { lastInsertRowid: assessId } = db.run(`
      INSERT INTO assessments (subject_id, title, type, max_marks, weightage, date)
      VALUES (2, ?, ?, ?, ?, ?)
    `, [a.title, a.type, a.max_marks, a.weightage, a.date]);

    for (const s of studentRows) {
      const studentObj = db.get("SELECT roll_number FROM users WHERE id = ?", [s.id]);
      let score = studentObj.roll_number === '2024CS103' ? Math.round(a.max_marks * 0.52) : Math.round(a.max_marks * 0.82);
      db.run("INSERT INTO marks (assessment_id, student_id, marks_obtained) VALUES (?, ?, ?)", [assessId, s.id, score]);
    }
  }

  console.log('Sample data seeding complete!');
}

module.exports = { initDatabase, getDb: () => db };
