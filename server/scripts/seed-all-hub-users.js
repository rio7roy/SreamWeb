#!/usr/bin/env node
/**
 * Seed ALL Hub Users Script
 * Creates a hub user for every BRC in brcs.json with a random 6-char password.
 * Outputs a CSV of credentials for distribution.
 */

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HUB_USERS_FILE = path.join(__dirname, '../data/hub_users.json');
const BRCS_FILE = path.join(__dirname, '../data/brcs.json');
const CREDENTIALS_FILE = path.join(__dirname, '../data/hub_credentials.csv');

function generatePassword(len = 8) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < len; i++) {
    pw += chars[crypto.randomInt(chars.length)];
  }
  return pw;
}

async function main() {
  let brcs = [];
  try {
    brcs = JSON.parse(fs.readFileSync(BRCS_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed to read brcs.json:', e.message);
    process.exit(1);
  }

  console.log(`Found ${brcs.length} BRCs. Creating hub users...`);

  const hubUsers = [];
  const csvRows = ['BRC Code,Location,School Name,District,Username,Password'];

  for (const brc of brcs) {
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 12);

    hubUsers.push({
      id: `hub-${brc.code}`,
      email: `hub-${brc.code.toLowerCase()}@stream.edu`,
      username: brc.code,
      password: hashedPassword,
      name: `${brc.location} / ${brc.name}`,
      brcCode: brc.code,
      role: 'STREAM_LAB',
      assignedBrcs: [brc.code],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    csvRows.push(`${brc.code},${brc.location},${brc.name},${brc.district},${brc.code},${password}`);
    process.stdout.write(`\r  Processed ${hubUsers.length}/${brcs.length}`);
  }

  fs.writeFileSync(HUB_USERS_FILE, JSON.stringify(hubUsers, null, 2));
  fs.writeFileSync(CREDENTIALS_FILE, csvRows.join('\n'));

  console.log(`\n\n✅ Created ${hubUsers.length} hub users`);
  console.log(`📁 Users saved to: ${HUB_USERS_FILE}`);
  console.log(`📋 Credentials CSV saved to: ${CREDENTIALS_FILE}`);
  console.log(`\n⚠️  IMPORTANT: Share the CSV securely and delete it after distribution!`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
