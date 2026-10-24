type RunnableStatement = {
  run(): unknown;
};

type TransactionCapable = {
  transaction<T>(callback: () => T): T;
};

export function runSqliteBatch(db: TransactionCapable, statements: RunnableStatement[]) {
  return db.transaction(() => {
    for (const statement of statements) statement.run();
  });
}
