// Simple script to reset products table
const { execSync } = require('child_process');

try {
  console.log('Resetting products table...');
  
  // Run raw SQL to clean up the database
  const command = `npx prisma db execute --stdin`;
  const sql = `
    -- Delete all barcodes first (foreign key constraint)
    DELETE FROM barcodes;
    
    -- Delete all products
    DELETE FROM products;
    
    -- Reset the sequence
    ALTER SEQUENCE products_id_seq RESTART WITH 1;
  `;
  
  execSync(command, { 
    input: sql, 
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('Products table reset successfully!');
  
} catch (error) {
  console.error('Error resetting products table:', error.message);
}