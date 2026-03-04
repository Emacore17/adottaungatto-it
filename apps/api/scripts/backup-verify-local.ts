import { verifyLocalBackup } from './backup-lib';

const requestedDirectory = process.argv[2];

verifyLocalBackup(requestedDirectory)
  .then((result) => {
    console.log(
      `[backup:verify] Backup verified in ${result.backupDir} (database restore check: ${result.verifiedDatabaseName})`,
    );
  })
  .catch((error: Error) => {
    console.error(`[backup:verify] ${error.message}`);
    process.exit(1);
  });
