# Abhaya — Women's Safety App

## Overview

React Native (Expo) frontend + Flask backend women's safety app.
Features: passive accelerometer anomaly detection, auto SMS via
Fast2SMS, danger heatmap via Firebase, disguised calculator UI.

## Structure

- /frontend — React Native + Expo (Expo Router)
- /backend — Python Flask

## Stack

Frontend: React Native, Expo, Firebase Realtime DB, React Native Maps
Backend: Flask, Fast2SMS, Gemini API, Firebase Admin SDK

## Rules

- One feature at a time. Wait for confirmation before next step.
- Tell me every package before installing it.
- After each step, state exactly what terminal command to run.
- Never modify files outside the current feature's scope.
- Backend runs at http://localhost:5000 during development.
- All frontend API calls go through frontend/services/api.ts only.
- Never hardcode API keys. Always use .env files.
