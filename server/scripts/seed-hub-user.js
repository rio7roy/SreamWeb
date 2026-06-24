#!/usr/bin/env node
/**
 * Seed Hub User Script
 * 
 * Usage: node scripts/seed-hub-user.js <BRC_CODE> <PASSWORD>
 * Example: node scripts/seed-hub-user.js 32110100105SH mypassword123
 * 
 * This will hash the password and add a new hub user entry to hub_users.json.
 * If the BRC code already exists, it will update the password.
 */

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HUB_USERS_FILE = path.join(__dirname, '../data/hub_users.json');
const BRCS_FILE = path.join(__dirname, '../data/brcs.json');

async function main() {
  const [,, brcCode, password] = process.argv;

  if (!brcCode || !password) {
    console.error('Usage: node scripts/seed-hub-user.js <BRC_CODE> <PASSWORD>');
    process.exit(1);
  }

  // Validate BRC code exists
  let brcs = [];
  try {
    brcs = JSON.parse(fs.readFileSync(BRCS_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed to read brcs.json:', e.message);
    process.exit(1);
  }

  const brc = brcs.find(b => b.code === brcCode);
  if (!brc) {
    console.error(`BRC code "${brcCode}" not found in brcs.json`);
    console.error('Available codes:', brcs.slice(0, 5).map(b => b.code).join(', '), '...');
    process.exit(1);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Load existing hub users
  let hubUsers = [];
  try {
    hubUsers = JSON.parse(fs.readFileSync(HUB_USERS_FILE, 'utf8'));
  } catch (e) {
    hubUsers = [];
  }

  // Check if user already exists
  const existingIndex = hubUsers.findIndex(u => u.username === brcCode);
  if (existingIndex !== -1) {
    hubUsers[existingIndex].password = hashedPassword;
    console.log(`✅ Updated password for existing hub user: ${brcCode}`);
  } else {
    const newUser = {
      id: `hub-${brcCode}`,
      email: `hub-${brcCode.toLowerCase()}@stream.edu`,
      username: brcCode,
      password: hashedPassword,
      name: `${brc.location} / ${brc.name}`,
      brcCode: brcCode,
      role: 'STREAM_LAB',
      assignedBrcs: [brcCode],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    hubUsers.push(newUser);
    console.log(`✅ Created new hub user:`);
    console.log(`   Username: ${brcCode}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   BRC: ${brc.location} / ${brc.name}`);
  }

  fs.writeFileSync(HUB_USERS_FILE, JSON.stringify(hubUsers, null, 2));
  console.log(`\n📁 Saved to ${HUB_USERS_FILE}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
