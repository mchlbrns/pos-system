# Offline Local Deployment Guide

This guide details how to set up local networking for shops operating with little to no internet connection.

## 1. Local Wi-Fi Router Configuration
For shops using mobile tablets as cashier terminals connecting to a main desktop server:
1. Connect the desktop server and tablets to the same local Wi-Fi router.
2. In the desktop Command Prompt, run `ipconfig` to find the local IP (e.g., `192.168.1.100`).
3. Set tablet POS browser address to `http://192.168.1.100:5173`.

## 2. SQLite Database Backups
Since data is saved locally on disk:
- Set up a daily backup using `scripts\backup.bat`.
- This copies the database file to an external USB flash drive automatically.
