#!/usr/bin/env node
/**
 * Script to update old assignments with user display names
 * Reads users from encrypted users.json and enriches completions
 */

const fs = require('fs');
const path = require('path');
const { createDecipheriv, pbkdf2Sync } = require('crypto');

const ALGO = 'aes-256-cbc';

function getKeyFromEnv() {
  const key = process.env.USER_DATA_KEY || 'dev-secret-key-change-in-production';
  return pbkdf2Sync(key, 'usersalt', 100000, 32, 'sha256');
}

function decryptJson(payload) {
  try {
    const [ivHex, encHex] = payload.split(':');
    if (!ivHex || !encHex) return { users: [] };
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const key = getKeyFromEnv();
    const decipher = createDecipheriv(ALGO, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return { users: [] };
  }
}

function readUsersFile() {
  const dataFile = path.join(__dirname, '..', 'data', 'users.enc.json');
  if (!fs.existsSync(dataFile)) return { users: [] };
  
  try {
    const payload = fs.readFileSync(dataFile, 'utf8');
    return decryptJson(payload);
  } catch (err) {
    console.error('Failed to read users file:', err.message);
    return { users: [] };
  }
}

function updateAssignments() {
  const assignmentsFile = path.join(__dirname, '..', 'data', 'assignments.json');
  if (!fs.existsSync(assignmentsFile)) {
    console.log('No assignments file found');
    return;
  }

  try {
    const assignments = JSON.parse(fs.readFileSync(assignmentsFile, 'utf8'));
    const usersData = readUsersFile();
    const usersMap = {};
    (usersData.users || []).forEach((u) => {
      usersMap[u.id] = u.name || u.id;
    });

    let updated = 0;
    assignments.forEach((a) => {
      if (a.completions) {
        a.completions.forEach((c) => {
          // If userName is missing or is just the userId, try to fill it from users
          if (!c.userName || c.userName === c.userId) {
            const displayName = usersMap[c.userId];
            if (displayName && displayName !== c.userId) {
              c.userName = displayName;
              updated++;
            }
          }
        });
      }
    });

    if (updated > 0) {
      fs.writeFileSync(assignmentsFile, JSON.stringify(assignments, null, 2), 'utf8');
      console.log(`✓ Updated ${updated} completion(s) with user display names`);
    } else {
      console.log('No updates needed - all completions already have display names');
    }
  } catch (err) {
    console.error('Error updating assignments:', err.message);
    process.exit(1);
  }
}

updateAssignments();
