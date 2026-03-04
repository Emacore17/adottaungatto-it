import { createLocalBackup } from './backup-lib';

const requestedDirectory = process.argv[2];

createLocalBackup(requestedDirectory)
  .then((backupDir) => {
    console.log(`[backup:create] Backup created in ${backupDir}`);
  })
  .catch((error: Error) => {
    console.error(`[backup:create] ${error.message}`);
    process.exit(1);
  });
