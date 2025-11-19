const fs = require('fs');
const path = require('path');

// Créer le dossier de destination
const destDir = path.join(__dirname, '..', 'dist', 'main', 'main-process', 'services', 'database', 'migrations');
const sourceDir = path.join(__dirname, '..', 'src', 'main-process', 'services', 'database', 'migrations');

// Créer le dossier récursivement si il n'existe pas
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log('Created migrations directory:', destDir);
}

// Copier tous les fichiers .sql
if (fs.existsSync(sourceDir)) {
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.sql'));

  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log('Copied:', file);
  });

  console.log(`Successfully copied ${files.length} migration file(s)`);
} else {
  console.log('No migrations directory found at:', sourceDir);
}
