import { restoreLocalBackup } from './backup-lib';

const args = process.argv.slice(2);
const requestedDirectory = args.find((arg) => !arg.startsWith('--'));
const isConfirmed = args.includes('--yes');

if (!isConfirmed) {
  console.error(
    '[backup:restore] Refusing to run without explicit confirmation. Re-run with --yes.',
  );
  process.exit(1);
}

restoreLocalBackup(requestedDirectory)
  .then((result) => {
    console.log(
      `[backup:restore] Backup restored from ${result.backupDir} (database=${result.restoredDatabaseName}, buckets=${result.restoredBuckets.join(', ') || 'none'}, search_reindexed=${result.searchReindexed})`,
    );
  })
  .catch((error: Error) => {
    console.error(`[backup:restore] ${error.message}`);
    process.exit(1);
  });
