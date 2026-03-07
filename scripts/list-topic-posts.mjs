import { promises as fs } from 'node:fs';
import path from 'node:path';

const POSTS_DIR = path.resolve('src/_posts');
const TARGET_TOPIC = process.argv[2];

if (!TARGET_TOPIC) {
  console.error('Укажи topic, например: node scripts/list-topic-posts.mjs marketing-management');
  process.exit(1);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return fullPath;
    })
  );
  return files.flat();
}

function extractFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

function extractField(frontMatter, fieldName) {
  if (!frontMatter) return null;
  const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, 'm');
  const match = frontMatter.match(regex);
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

async function main() {
  const allFiles = await walk(POSTS_DIR);
  const postFiles = allFiles.filter((file) =>
    /\.(njk|md|markdown|html)$/i.test(file)
  );

  const results = [];

  for (const file of postFiles) {
    const content = await fs.readFile(file, 'utf8');
    const frontMatter = extractFrontMatter(content);
    if (!frontMatter) continue;

    const topic = extractField(frontMatter, 'topic');
    if (topic !== TARGET_TOPIC) continue;

    results.push({
      file: path.relative(process.cwd(), file),
      date: extractField(frontMatter, 'date') ?? '',
      title: extractField(frontMatter, 'title') ?? '',
      permalink: extractField(frontMatter, 'permalink') ?? '',
    });
  }

  results.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`Посты с topic="${TARGET_TOPIC}": ${results.length}\n`);

  for (const item of results) {
    console.log(`- ${item.date} | ${item.file}`);
    if (item.title) console.log(`  title: ${item.title}`);
    if (item.permalink) console.log(`  permalink: ${item.permalink}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});