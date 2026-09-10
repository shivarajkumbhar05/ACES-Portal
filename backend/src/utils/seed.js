require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, mongoose } = require('../config/db');
const Department = require('../models/Department');
const Admin = require('../models/Admin');
const { DEPARTMENTS, ADMIN_ROLES } = require('../config/constants');

async function seed() {
  await connectDB();

  for (const name of DEPARTMENTS) {
    await Department.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
  console.log(`[seed] Ensured ${DEPARTMENTS.length} departments exist`);

  const username = (process.env.SEED_ADMIN_USERNAME || 'superadmin').toLowerCase();
  const existing = await Admin.findOne({ username });

  if (existing) {
    console.log(`[seed] Admin "${username}" already exists - skipping creation`);
  } else {
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password || password === 'ChangeMe@2026') {
      throw new Error('Set a unique SEED_ADMIN_PASSWORD before creating the initial admin account');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await Admin.create({
      username,
      passwordHash,
      role: ADMIN_ROLES.SUPER_ADMIN,
      name: 'ACES Super Admin'
    });
    console.log(`[seed] Created super admin "${username}" - CHANGE THE PASSWORD AFTER FIRST LOGIN`);
  }

  await mongoose.connection.close();
  console.log('[seed] Done.');
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
