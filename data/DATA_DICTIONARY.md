# UCI Student Performance Dataset — Data Dictionary & Provenance

## 1. Overview & Source Attribution

- **Dataset Name:** Student Performance Dataset
- **Repository:** UCI Machine Learning Repository
- **Official URL:** https://archive.ics.uci.edu/dataset/320/student+performance
- **Direct Citation:** Cortez, P., & Silva, A. (2008). *Using Data Mining to Predict Secondary School Student Performance*. In Proceedings of 5th Annual Future Business Technology Conference (FUBUTEC 2008), pp. 5-12, Porto, Portugal.
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Retrieved On:** 2026-10-24
- **Original Files In Repository:**
  - `student-mat.csv`: 395 records of secondary school students taking the Mathematics course.
  - `student-por.csv`: 649 records of secondary school students taking the Portuguese language course.
  - `student.txt`: Attribute definitions and merge documentation.
  - `student-merge.R`: R script demonstrating 13-attribute linkage key for overlapping students.

---

## 2. Important Architectural Distinctions & Known Limitations

> [!IMPORTANT]
> The UCI Student Performance Dataset is an empirical educational research dataset from Portuguese secondary education.
> It **must not** be confused with or substituted for real-time institutional operations at REVA University or EduTrack.

1. **Absences vs. Attendance Sessions**:
   - `absences` in the UCI dataset is a single integer representing aggregate missed school days over the school period (range: 0 to 93).
   - The UCI dataset **does not** contain verified lecture-by-lecture attendance sessions (date, time, topic, status: Present, Late, Absent, Excused).
   - `absences` is strictly maintained as an empirical attribute in `uci_student_records`. It is **never** transformed into fabricated operational lecture sessions or fake attendance percentages.
2. **Grades ($G1, G2, G3$) vs. College Internal Assessment Marks**:
   - $G1, G2, G3$ are Portuguese secondary school period grades on a 0 to 20 scale.
   - They **do not** correspond to college internal assessment components (quizzes, assignments, lab practicals, midterms).
   - In EduTrack, operational internal assessment marks ($0$ to $100\%$) and CGPA are tracked separately in the operational tables `assessments` and `marks`.
3. **Student Overlap Between Courses**:
   - The dataset contains 382 students who enrolled in both Mathematics and Portuguese.
   - In EduTrack, records from both courses are imported with their genuine source row indexes (`source_row_index`), and linked via a deterministic technical composite identifier `student_composite_id` based on Cortez & Silva's 13 matching attributes:
     `school:sex:age:address:famsize:Pstatus:Medu:Fedu:Mjob:Fjob:reason:nursery:internet`.

---

## 3. Data Dictionary

| Column | Description | Data Type | Valid Values / Range | Application Mapping | Status | Limitations |
|---|---|---|---|---|---|---|
| `school` | Student's secondary school | Text | `"GP"` (Gabriel Pereira), `"MS"` (Mousinho da Silveira) | `uci_student_records.school` | Observed | Portuguese schools only |
| `sex` | Student's biological sex | Text | `"F"` (Female), `"M"` (Male) | `uci_student_records.sex` | Observed | Binary classification in source |
| `age` | Student's age | Integer | 15 to 22 | `uci_student_records.age` | Observed | Secondary school demographic |
| `address` | Home address geographic type | Text | `"U"` (Urban), `"R"` (Rural) | `uci_student_records.address` | Observed | Binary classification |
| `famsize` | Family size | Text | `"LE3"` ($\le 3$), `"GT3"` ($> 3$) | `uci_student_records.famsize` | Observed | Self-reported |
| `Pstatus` | Parent's cohabitation status | Text | `"T"` (Living together), `"A"` (Apart) | `uci_student_records.pstatus` | Observed | Family structure indicator |
| `Medu` | Mother's education level | Integer | 0: None, 1: Primary (4th grade), 2: 5th-9th grade, 3: Secondary, 4: Higher education | `uci_student_records.medu` | Observed | Ordinal scale 0-4 |
| `Fedu` | Father's education level | Integer | 0: None, 1: Primary, 2: 5th-9th grade, 3: Secondary, 4: Higher education | `uci_student_records.fedu` | Observed | Ordinal scale 0-4 |
| `Mjob` | Mother's occupation | Text | `"teacher"`, `"health"`, `"services"`, `"at_home"`, `"other"` | `uci_student_records.mjob` | Observed | Nominal category |
| `Fjob` | Father's occupation | Text | `"teacher"`, `"health"`, `"services"`, `"at_home"`, `"other"` | `uci_student_records.fjob` | Observed | Nominal category |
| `reason` | Reason for choosing school | Text | `"home"`, `"reputation"`, `"course"`, `"other"` | `uci_student_records.reason` | Observed | Nominal |
| `guardian` | Student's legal guardian | Text | `"mother"`, `"father"`, `"other"` | `uci_student_records.guardian` | Observed | Nominal |
| `traveltime` | Travel time to school | Integer | 1: $<15$ min, 2: 15-30 min, 3: 30-60 min, 4: $>60$ min | `uci_student_records.traveltime` | Observed | Ordinal 1-4 |
| `studytime` | Weekly study time | Integer | 1: $<2$ hrs, 2: 2-5 hrs, 3: 5-10 hrs, 4: $>10$ hrs | `uci_student_records.studytime` | Observed | Ordinal 1-4 |
| `failures` | Past class failures | Integer | 0, 1, 2, 3 (if $\ge 3$) | `uci_student_records.failures` | Observed | Capped at 3 in source |
| `schoolsup` | Extra educational support | Text | `"yes"`, `"no"` | `uci_student_records.schoolsup` | Observed | Institutional remedial support |
| `famsup` | Family educational support | Text | `"yes"`, `"no"` | `uci_student_records.famsup` | Observed | Binary |
| `paid` | Extra paid tutoring classes | Text | `"yes"`, `"no"` | `uci_student_records.paid` | Observed | Subject-specific tutoring |
| `activities` | Extracurricular activities | Text | `"yes"`, `"no"` | `uci_student_records.activities` | Observed | Binary |
| `nursery` | Attended nursery school | Text | `"yes"`, `"no"` | `uci_student_records.nursery` | Observed | Early childhood education |
| `higher` | Aspires to higher education | Text | `"yes"`, `"no"` | `uci_student_records.higher` | Observed | Motivation indicator |
| `internet` | Home internet access | Text | `"yes"`, `"no"` | `uci_student_records.internet` | Observed | Infrastructure indicator |
| `romantic` | In a romantic relationship | Text | `"yes"`, `"no"` | `uci_student_records.romantic` | Observed | Personal demographic |
| `famrel` | Family relationship quality | Integer | 1 (Very bad) to 5 (Excellent) | `uci_student_records.famrel` | Observed | Likert 1-5 |
| `freetime` | Free time after school | Integer | 1 (Very low) to 5 (Very high) | `uci_student_records.freetime` | Observed | Likert 1-5 |
| `goout` | Going out with friends | Integer | 1 (Very low) to 5 (Very high) | `uci_student_records.goout` | Observed | Likert 1-5 |
| `Dalc` | Workday alcohol consumption | Integer | 1 (Very low) to 5 (Very high) | `uci_student_records.dalc` | Observed | Likert 1-5 |
| `Walc` | Weekend alcohol consumption | Integer | 1 (Very low) to 5 (Very high) | `uci_student_records.walc` | Observed | Likert 1-5 |
| `health` | Current health status | Integer | 1 (Very bad) to 5 (Very good) | `uci_student_records.health` | Observed | Likert 1-5 |
| `absences` | Total school absences | Integer | 0 to 93 | `uci_student_records.absences` | Observed | **Count of missed days**. Not a percentage! |
| `G1` | First period course grade | Integer | 0 to 20 | `uci_student_records.g1` | Observed | 20-point scale. Passing $\ge 10$ |
| `G2` | Second period course grade | Integer | 0 to 20 | `uci_student_records.g2` | Observed | 20-point scale. Passing $\ge 10$ |
| `G3` | Final course grade | Integer | 0 to 20 | `uci_student_records.g3` | Observed | Primary academic target |

---

## 4. Technical Linkage & Provenance Metadata

| Application Field | Description | Type | Source / Generation Rule |
|---|---|---|---|
| `source_file` | Source file name | Text | `"student-mat.csv"` or `"student-por.csv"` |
| `source_row_index` | 1-indexed row number in CSV | Integer | Derived directly from line position in source file |
| `subject` | Curriculum course | Text | `"Mathematics"` or `"Portuguese"` |
| `student_composite_id` | Deterministic student linkage key | Text | Base64-encoded digest of the 13 Cortez & Silva demographic matching attributes |
| `imported_at` | Database ingestion timestamp | Datetime | Recorded at time of import |
