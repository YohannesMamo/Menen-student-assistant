import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database Table
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menen_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure SAStatus has at least 'Active' status
    const statusCheck = await pool.query('SELECT * FROM "SAStatus" WHERE "StatusID" = $1', ['Active']);
    if (statusCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO "SAStatus" ("RecordID", "StatusID", "StatusDescription")
        VALUES ($1, $2, $3)
      `, [crypto.randomUUID(), 'Active', 'Active Student']);
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
};

initDb();

// Routes
// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const user = await pool.query('SELECT * FROM menen_users WHERE email = $1', [email]);
    if (user.rows.length !== 0) {
      return res.status(401).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const bcryptPassword = await bcrypt.hash(password, salt);

    // Insert user
    const newUser = await pool.query(
      'INSERT INTO menen_users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, bcryptPassword]
    );

    // Generate token
    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user: { id: newUser.rows[0].id, name, email } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await pool.query('SELECT * FROM menen_users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Student Info
app.get('/api/student-info/:studentId', async (req, res) => {
  const { studentId } = req.params;
  try {
    const studentInfo = await pool.query(
      'SELECT * FROM "StudentInfo" WHERE "uid" = $1',
      [parseInt(studentId)]
    );
    
    if (studentInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Student information not found' });
    }

    res.json(studentInfo.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Student Info registration
app.post('/api/student-info', async (req, res) => {
  const { 
    studentId, 
    firstName, 
    middleName, 
    lastName, 
    dateOfBirth, 
    phoneMobile, 
    phoneResidence, 
    webAddress, 
    address, 
    grade, 
    gender, 
    status 
  } = req.body;

  const uid = parseInt(studentId);
  const dob = dateOfBirth || null;
  const pRes = phoneResidence || null;
  const web = webAddress || null;

  try {
    // Check if info already exists to decide between INSERT or UPDATE
    const existing = await pool.query('SELECT * FROM "StudentInfo" WHERE "uid" = $1', [uid]);
    
    let result;
    if (existing.rows.length > 0) {
      // UPDATE
      result = await pool.query(
        `UPDATE "StudentInfo" SET 
          "StuFirstName" = $2, 
          "StuMiddleName" = $3, 
          "StuLastName" = $4, 
          "StuDateOfBirth" = $5, 
          "StuPhoneMobile" = $6, 
          "StuPhoneResidence" = $7, 
          "StuWebAddress" = $8, 
          "StuAddress" = $9, 
          "StuGrade" = $10, 
          "StuGender" = $11, 
          "StuStatus" = $12,
          "UpdatedAt" = NOW()
        WHERE "uid" = $1 RETURNING *`,
        [uid, firstName, middleName, lastName, dob, phoneMobile, pRes, web, address, grade, gender, status]
      );
    } else {
      // INSERT - Generate custom StudentID (STUXXXXXXXX)
      // 1. Get the latest StudentID that starts with 'STU'
      const latestRes = await pool.query(
        `SELECT "StudentID" FROM "StudentInfo" 
         WHERE "StudentID" LIKE 'STU%' 
         ORDER BY "StudentID" DESC LIMIT 1`
      );

      let nextIdNumber = 1;
      if (latestRes.rows.length > 0) {
        const latestId = latestRes.rows[0].StudentID;
        const currentNumber = parseInt(latestId.substring(3));
        if (!isNaN(currentNumber)) {
          nextIdNumber = currentNumber + 1;
        }
      }

      // 2. Format: STU + 7 digits (zero-padded) = 10 characters total
      const generatedStudentId = `STU${nextIdNumber.toString().padStart(7, '0')}`;

      result = await pool.query(
        `INSERT INTO "StudentInfo" (
          "uid",
          "StudentID", 
          "StuFirstName", 
          "StuMiddleName", 
          "StuLastName", 
          "StuDateOfBirth", 
          "StuPhoneMobile", 
          "StuPhoneResidence", 
          "StuWebAddress", 
          "StuAddress", 
          "StuGrade", 
          "StuGender", 
          "StuStatus",
          "CreatedAt",
          "UpdatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) RETURNING *`,
        [uid, generatedStudentId, firstName, middleName, lastName, dob, phoneMobile, pRes, web, address, grade, gender, status]
      );
    }

    res.json({ message: 'Student information saved successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard data: Textbook progress
app.get('/api/dashboard/textbooks/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const uid = parseInt(studentId);

  try {
    // 1. First, find the "StudentID" string (e.g. STU0000001) using the "uid"
    const studentInfo = await pool.query(
      'SELECT "StudentID" FROM "StudentInfo" WHERE "uid" = $1',
      [uid]
    );

    if (studentInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Student information not found' });
    }

    const actualStudentId = studentInfo.rows[0].StudentID;

    // 2. Call the database function using the actual StudentID string
    const result = await pool.query(
      'SELECT * FROM get_student_textbook_progress($1)',
      [actualStudentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error calling get_student_textbook_progress:', err.message);
    res.status(500).json({ message: 'Error fetching textbook progress' });
  }
});

// Study Page: Get Textbook Details
app.get('/api/study/textbook/:stbid', async (req, res) => {
  const { stbid } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM "STextBooks" WHERE "STBID" = $1',
      [stbid]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Textbook not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Study Page: Get Sections for Textbook
app.get('/api/study/sections/:stbid', async (req, res) => {
  const { stbid } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM "STBSections" WHERE "STBID" = $1 ORDER BY "STBChapterID", "STBSectionID"',
      [stbid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Study Page: Get Basic Notes/Keywords for Section
app.get('/api/study/basic-notes/:stbid/:sectionId', async (req, res) => {
  const { stbid, sectionId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM "STBBasicNotes" WHERE "STBID" = $1 AND "STBSectionID" = $2',
      [stbid, sectionId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Study Page: Get Presentations for Section
app.get('/api/study/presentations/:stbid/:sectionId', async (req, res) => {
  const { stbid, sectionId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM "STBPresentations" WHERE "STBID" = $1 AND "STBSectionID" = $2',
      [stbid, sectionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Study Page: Get/Save Student Notes
app.get('/api/study/notes/:studentId/:stbid/:sectionId', async (req, res) => {
  const { studentId, stbid, sectionId } = req.params;
  try {
    // Need actual StudentID string
    const studentInfo = await pool.query('SELECT "StudentID" FROM "StudentInfo" WHERE "uid" = $1', [parseInt(studentId)]);
    if (studentInfo.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
    const actualId = studentInfo.rows[0].StudentID;

    const result = await pool.query(
      'SELECT * FROM "StudyNotes" WHERE "StudentID" = $1 AND "STBID" = $2 AND "SectionID" = $3',
      [actualId, stbid, sectionId]
    );
    res.json(result.rows[0] || { NoteText: '' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/study/notes', async (req, res) => {
  const { studentId, stbid, sectionId, chapterId, noteText, pageNumber } = req.body;
  try {
    const studentInfo = await pool.query('SELECT "StudentID" FROM "StudentInfo" WHERE "uid" = $1', [parseInt(studentId)]);
    if (studentInfo.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
    const actualId = studentInfo.rows[0].StudentID;

    const existing = await pool.query(
      'SELECT "RecordID" FROM "StudyNotes" WHERE "StudentID" = $1 AND "STBID" = $2 AND "SectionID" = $3',
      [actualId, stbid, sectionId]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE "StudyNotes" SET "NoteText" = $1, "UpdatedAt" = NOW() WHERE "RecordID" = $2 RETURNING *',
        [noteText, existing.rows[0].RecordID]
      );
    } else {
      result = await pool.query(
        'INSERT INTO "StudyNotes" ("RecordID", "StudentID", "STBID", "SectionID", "ChapterID", "NoteText", "PageNumber", "CreatedAt", "UpdatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
        [crypto.randomUUID(), actualId, stbid, sectionId, chapterId, noteText, pageNumber || '1']
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Study Page: Update Section Progress
app.post('/api/study/progress', async (req, res) => {
  const { studentId, stbid, sectionId, chapterId, isCompleted } = req.body;
  try {
    const studentInfo = await pool.query('SELECT "StudentID" FROM "StudentInfo" WHERE "uid" = $1', [parseInt(studentId)]);
    if (studentInfo.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
    const actualId = studentInfo.rows[0].StudentID;

    const existing = await pool.query(
      'SELECT "RecordID" FROM "StuSectionProgress" WHERE "StudentID" = $1 AND "STBID" = $2 AND "STBSectionID" = $3',
      [actualId, stbid, sectionId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE "StuSectionProgress" SET "IsCompleted" = $1, "LastAccessed" = NOW() WHERE "RecordID" = $2',
        [isCompleted, existing.rows[0].RecordID]
      );
    } else {
      await pool.query(
        'INSERT INTO "StuSectionProgress" ("RecordID", "StudentID", "STBID", "STBChapterID", "STBSectionID", "IsCompleted", "LastAccessed", "CreatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [crypto.randomUUID(), actualId, stbid, chapterId, sectionId, isCompleted]
      );
    }
    res.json({ message: 'Progress updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
