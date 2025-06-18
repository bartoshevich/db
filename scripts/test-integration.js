// scripts/test-integration.js
import { execSync } from 'child_process';
import * as fs from 'node:fs';
import path from 'path';

console.log('🧪 Запуск проверки сборки...');
try {
  fs.rmSync(path.resolve('_site'), { recursive: true, force: true });
  execSync('npm run build', { stdio: 'inherit' });
  
  if (!fs.existsSync(path.resolve('_site/index.html'))) {
      throw new Error("Файл index.html не был создан!");
  }
  
  console.log('✅ Сборка успешно завершена!');
  process.exit(0);
} catch (error) {
  console.error('❌ Сборка провалена:', error.message);
  process.exit(1);
}