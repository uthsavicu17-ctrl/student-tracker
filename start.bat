@echo off
title EduTrack - Student Attendance and Academic Performance Tracker
echo ====================================================================
echo   EduTrack - Student Attendance and Academic Performance Tracker
echo   REVA Weekend Hackathon Evaluation Project
echo ====================================================================
echo.
echo Starting EduTrack full-stack application...
echo - Backend API: http://localhost:5000
echo - Frontend UI: http://localhost:3000
echo.
cd /d "%~dp0"
npm run dev
pause
