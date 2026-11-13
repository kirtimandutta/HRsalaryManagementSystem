export function isDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /does not exist|no such table|SQLITE_CANTOPEN|unable to open the database|Environment variable not found: DATABASE_URL|PrismaClientInitializationError/i.test(
    `${error.name} ${error.message}`,
  );
}
