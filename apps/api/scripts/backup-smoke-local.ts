import { runBackupSmoke } from './backup-lib';

runBackupSmoke()
  .then((backupDir) => {
    console.log(`[backup:smoke] Backup and restore verification completed (${backupDir})`);
  })
  .catch((error: Error) => {
    console.error(`[backup:smoke] ${error.message}`);
    process.exit(1);
  });
