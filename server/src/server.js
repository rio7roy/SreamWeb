const app = require('./app');
const { env } = require('./config/env');
const { seedDatabase } = require('./config/database');

async function startServer() {
  try {
    // Seed in-memory database with demo users
    await seedDatabase();
    console.log('✅ In-memory database ready');

    app.listen(env.PORT, () => {
      console.log('');
      console.log('══════════════════════════════════════════════');
      console.log('  🚀 STREAM Ecosystem API Server');
      console.log('══════════════════════════════════════════════');
      console.log(`  Environment : ${env.NODE_ENV}`);
      console.log(`  Port        : ${env.PORT}`);
      console.log(`  Health      : http://localhost:${env.PORT}/api/health`);
      console.log(`  Database    : In-Memory (no PostgreSQL required)`);
      console.log('══════════════════════════════════════════════');
      console.log('');
      console.log('  Demo Logins:');
      console.log('  ─────────────────────────────────────');
      console.log('  Admin           → admin@stream.edu / Admin@123');
      console.log('  STREAM Expert   → expert@stream.edu / Demo@123');
      console.log('  STREAM Hub      → lab@stream.edu / Demo@123');
      console.log('  iLab Corner     → ilab@stream.edu / Demo@123');
      console.log('  Creative Corner → creative@stream.edu / Demo@123');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down...');
  process.exit(0);
});

startServer();
