const fs = require('fs');
const path = require('path');

// Create migrations directory
const migrationsDir = 'dist/main/main-process/services/database/migrations';
fs.mkdirSync(migrationsDir, { recursive: true });

// Copy SQL files
const srcDir = 'src/main-process/services/database/migrations';
if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir).filter(file => file.endsWith('.sql'));
  files.forEach(file => {
    fs.copyFileSync(
      path.join(srcDir, file),
      path.join(migrationsDir, file)
    );
  });
  console.log(`Copied ${files.length} migration files`);
}