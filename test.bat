@echo off
title EduTrack - System Verification Test Runner
echo ====================================================================
echo   EduTrack - Running 20/20 System Verification Tests
echo ====================================================================
echo.
cd /d "%~dp0\backend"
npm test
pause
