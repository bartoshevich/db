// scripts/validate-sw.js
import fs from 'fs';
import path from 'path';

const swPath = path.resolve('_site/sw.js');

console.log('🔍 Проверка Service Worker...');

if (!fs.existsSync(swPath)) {
  console.error('❌ Service Worker не найден!');
  process.exit(1);
}

const swContent = fs.readFileSync(swPath, 'utf8');

const checks = [
  {
    name: 'Минимальный размер',
    test: () => swContent.length > 1000,
    error: 'Service Worker слишком мал!'
  },
  {
    name: 'Workbox присутствует',
    test: () => swContent.includes('workbox'),
    error: 'Service Worker не содержит Workbox!'
  },
  {
    name: 'SKIP_WAITING handler',
    test: () => swContent.includes('SKIP_WAITING'),
    error: 'Service Worker не содержит SKIP_WAITING handler!'
  }
];

let allPassed = true;

checks.forEach(check => {
  if (check.test()) {
    console.log(`✅ ${check.name}`);
  } else {
    console.error(`❌ ${check.name}: ${check.error}`);
    allPassed = false;
  }
});

try {
  new Function(swContent);
  console.log('✅ Синтаксис JavaScript корректен');
} catch (syntaxError) {
  console.error('❌ Синтаксическая ошибка:', syntaxError.message);
  allPassed = false;
}

if (allPassed) {
  console.log('\n🎉 Все проверки прошли успешно!');
  process.exit(0);
} else {
  console.log('\n💥 Некоторые проверки не прошли!');
  process.exit(1);
}