const fs = require('fs');
const path = require('path');
const { initDatabase, getDb } = require('../db');

const DATA_DIR = path.resolve(__dirname, '../../data');
const MAT_CSV_PATH = path.join(DATA_DIR, 'student-mat.csv');
const POR_CSV_PATH = path.join(DATA_DIR, 'student-por.csv');

// Parse a single semicolon-delimited CSV line taking quoted fields into account
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

// Read and parse semicolon-delimited CSV file
function readSemicolonCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset file not found at: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx];
      });
      obj._source_row_index = i; // 1-indexed data row position
      rows.push(obj);
    } else {
      console.warn(`Line ${i + 1} has ${values.length} fields instead of expected ${headers.length}. Skipped.`);
    }
  }

  return { headers, rows };
}

// Generate deterministic composite ID based on Cortez & Silva's 13 matching attributes
function generateCompositeId(row) {
  const keys = [
    row.school,
    row.sex,
    row.age,
    row.address,
    row.famsize,
    row.Pstatus,
    row.Medu,
    row.Fedu,
    row.Mjob,
    row.Fjob,
    row.reason,
    row.nursery,
    row.internet
  ];
  return 'UCI_' + Buffer.from(keys.join(':')).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
}

// Validate row fields and data ranges
function validateRow(row) {
  const errors = [];

  const age = parseInt(row.age, 10);
  if (isNaN(age) || age < 10 || age > 30) errors.push(`Invalid age: ${row.age}`);

  const absences = parseInt(row.absences, 10);
  if (isNaN(absences) || absences < 0) errors.push(`Invalid absences: ${row.absences}`);

  const g1 = parseInt(row.G1, 10);
  const g2 = parseInt(row.G2, 10);
  const g3 = parseInt(row.G3, 10);

  if (isNaN(g1) || g1 < 0 || g1 > 20) errors.push(`Invalid G1 grade: ${row.G1}`);
  if (isNaN(g2) || g2 < 0 || g2 > 20) errors.push(`Invalid G2 grade: ${row.G2}`);
  if (isNaN(g3) || g3 < 0 || g3 > 20) errors.push(`Invalid G3 grade: ${row.G3}`);

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      source_row_index: row._source_row_index,
      school: row.school,
      sex: row.sex,
      age,
      address: row.address,
      famsize: row.famsize,
      pstatus: row.Pstatus,
      medu: parseInt(row.Medu, 10) || 0,
      fedu: parseInt(row.Fedu, 10) || 0,
      mjob: row.Mjob,
      fjob: row.Fjob,
      reason: row.reason,
      guardian: row.guardian,
      traveltime: parseInt(row.traveltime, 10) || 1,
      studytime: parseInt(row.studytime, 10) || 1,
      failures: parseInt(row.failures, 10) || 0,
      schoolsup: row.schoolsup,
      famsup: row.famsup,
      paid: row.paid,
      activities: row.activities,
      nursery: row.nursery,
      higher: row.higher,
      internet: row.internet,
      romantic: row.romantic,
      famrel: parseInt(row.famrel, 10) || 3,
      freetime: parseInt(row.freetime, 10) || 3,
      goout: parseInt(row.goout, 10) || 3,
      dalc: parseInt(row.Dalc, 10) || 1,
      walc: parseInt(row.Walc, 10) || 1,
      health: parseInt(row.health, 10) || 3,
      absences,
      g1,
      g2,
      g3
    }
  };
}

async function runImport() {
  console.log('===============================================================');
  console.log('   UCI Student Performance Dataset - Automated Importer');
  console.log('===============================================================');
  console.log(`Checking files in: ${DATA_DIR}`);

  if (!fs.existsSync(MAT_CSV_PATH) || !fs.existsSync(POR_CSV_PATH)) {
    console.error(`ERROR: Missing required source files.\nExpected: ${MAT_CSV_PATH}\nand: ${POR_CSV_PATH}`);
    process.exit(1);
  }

  console.log('1. Initializing database...');
  await initDatabase();
  const db = getDb();

  // If table exists but lacks source_row_index column, recreate uci_student_records cleanly
  try {
    db.run("SELECT source_row_index FROM uci_student_records LIMIT 1;");
  } catch (err) {
    console.log('Upgrading uci_student_records schema to support source_row_index...');
    db.run("DROP TABLE IF EXISTS uci_student_records;");
    db.run(`
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
    `);
  }

  // 1. Record dataset metadata
  db.run(`
    INSERT OR REPLACE INTO uci_datasets_meta (
      name, source_url, license, download_date, description
    ) VALUES (
      'UCI Student Performance Dataset',
      'https://archive.ics.uci.edu/dataset/320/student+performance',
      'Creative Commons Attribution 4.0 International (CC BY 4.0)',
      '2026-10-24',
      'Educational dataset modeling student achievement in secondary education of two Portuguese schools (Cortez and Silva, 2008). Core targets: G1, G2, G3 (0-20 scale) and absences.'
    )
  `);

  console.log('2. Reading source CSV files...');
  const matParsed = readSemicolonCsv(MAT_CSV_PATH);
  const porParsed = readSemicolonCsv(POR_CSV_PATH);

  console.log(`- student-mat.csv: ${matParsed.rows.length} rows read.`);
  console.log(`- student-por.csv: ${porParsed.rows.length} rows read.`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalValidationErrors = 0;

  const datasetConfigs = [
    { name: 'Mathematics', file: 'student-mat.csv', rows: matParsed.rows },
    { name: 'Portuguese', file: 'student-por.csv', rows: porParsed.rows }
  ];

  for (const config of datasetConfigs) {
    console.log(`\nImporting ${config.name} (${config.file})...`);
    let fileImported = 0;
    let fileSkipped = 0;

    for (const rawRow of config.rows) {
      const validation = validateRow(rawRow);
      if (!validation.isValid) {
        console.warn(`Validation failure in ${config.file}:`, validation.errors.join(', '));
        totalValidationErrors++;
        continue;
      }

      const compositeId = generateCompositeId(rawRow);
      const d = validation.data;

      try {
        const res = db.run(`
          INSERT OR IGNORE INTO uci_student_records (
            source_file, source_row_index, subject, student_composite_id,
            school, sex, age, address, famsize, pstatus,
            medu, fedu, mjob, fjob, reason, guardian,
            traveltime, studytime, failures, schoolsup, famsup,
            paid, activities, nursery, higher, internet, romantic,
            famrel, freetime, goout, dalc, walc, health,
            absences, g1, g2, g3
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?
          )
        `, [
          config.file, d.source_row_index, config.name, compositeId,
          d.school, d.sex, d.age, d.address, d.famsize, d.pstatus,
          d.medu, d.fedu, d.mjob, d.fjob, d.reason, d.guardian,
          d.traveltime, d.studytime, d.failures, d.schoolsup, d.famsup,
          d.paid, d.activities, d.nursery, d.higher, d.internet, d.romantic,
          d.famrel, d.freetime, d.goout, d.dalc, d.walc, d.health,
          d.absences, d.g1, d.g2, d.g3
        ]);

        if (res.changes > 0) {
          fileImported++;
        } else {
          fileSkipped++;
        }
      } catch (err) {
        console.error(`Database insertion error row ${d.source_row_index}:`, err.message);
        fileSkipped++;
      }
    }

    console.log(`✓ ${config.name}: ${fileImported} rows inserted, ${fileSkipped} skipped (duplicates / already present).`);
    totalImported += fileImported;
    totalSkipped += fileSkipped;
  }

  // Update total records in metadata
  const totalCountRow = db.get('SELECT COUNT(*) AS total FROM uci_student_records');
  const actualTotalInDb = totalCountRow ? totalCountRow.total : 0;
  db.run('UPDATE uci_datasets_meta SET total_records = ? WHERE name = ?', [actualTotalInDb, 'UCI Student Performance Dataset']);

  // Overlap analysis (students in both Math and Portuguese)
  const overlapRow = db.get(`
    SELECT COUNT(*) AS overlap_count FROM (
      SELECT student_composite_id 
      FROM uci_student_records 
      GROUP BY student_composite_id 
      HAVING COUNT(DISTINCT subject) > 1
    )
  `);
  const overlapCount = overlapRow ? overlapRow.overlap_count : 0;

  console.log('\n===============================================================');
  console.log('              IMPORT EXECUTION REPORT');
  console.log('===============================================================');
  console.log(`• Total Rows in Math Source (student-mat.csv):       ${matParsed.rows.length}`);
  console.log(`• Total Rows in Portuguese Source (student-por.csv): ${porParsed.rows.length}`);
  console.log(`• Total Source Enrollment Rows:                      ${matParsed.rows.length + porParsed.rows.length}`);
  console.log(`• New Records Inserted This Run:                     ${totalImported}`);
  console.log(`• Existing / Duplicate Records Skipped:              ${totalSkipped}`);
  console.log(`• Validation Errors:                                 ${totalValidationErrors}`);
  console.log(`• Total UCI Records Now in Database:                 ${actualTotalInDb}`);
  console.log(`• Distinct Demographic Student Profiles Overlap:     ${overlapCount}`);
  console.log('===============================================================');
  console.log('✓ Import completed successfully and saved to database.sqlite');
}

if (require.main === module) {
  runImport().catch(err => {
    console.error('Import failed with exception:', err);
    process.exit(1);
  });
}

module.exports = { runImport, readSemicolonCsv, validateRow, generateCompositeId };
