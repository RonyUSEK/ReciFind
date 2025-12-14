const { Pool } = require('pg');

async function cleanupTestRecipes() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
  });

  const titles = [
    'Test Chef Recipe',
    'Update Test Recipe',
    'Updated Recipe Title',
    'Delete Test Recipe',
  ];

  try {
    const result = await pool.query(
      'DELETE FROM recipes WHERE title = ANY($1::text[]) RETURNING id, title, status',
      [titles]
    );

    return {
      deleted: result.rows,
      count: result.rowCount,
    };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  cleanupTestRecipes()
    .then(({ count, deleted }) => {
      console.log(`Deleted ${count} test recipe(s).`);
      if (deleted.length > 0) {
        const byTitle = deleted.reduce((acc, r) => {
          acc[r.title] = (acc[r.title] || 0) + 1;
          return acc;
        }, {});
        console.log('Breakdown:', byTitle);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}

module.exports = { cleanupTestRecipes };
