import { promises as fs } from 'node:fs';
import path from 'node:path';
import blogTopics from '../src/_data/blogTopics.js';

const POSTS_DIR = path.resolve('src/_posts');

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

function extractTopic(frontMatter) {
  if (!frontMatter) return null;

  const match = frontMatter.match(/^topic:\s*(.+)$/m);
  if (!match) return null;

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

async function main() {
  const allFiles = await walk(POSTS_DIR);
  const postFiles = allFiles.filter((file) =>
    /\.(njk|md|markdown|html)$/i.test(file)
  );

  const counts = new Map(blogTopics.map((topic) => [topic.key, 0]));
  let total = 0;

  for (const file of postFiles) {
    const content = await fs.readFile(file, 'utf8');
    const frontMatter = extractFrontMatter(content);
    const topic = extractTopic(frontMatter);

    if (!topic) continue;
    if (!counts.has(topic)) continue;

    counts.set(topic, counts.get(topic) + 1);
    total += 1;
  }

  console.log(`Всего постов с topic: ${total}\n`);
  console.log('=== РАСПРЕДЕЛЕНИЕ ПО ТЕМАМ ===');

  for (const topic of blogTopics) {
    const count = counts.get(topic.key) ?? 0;
    console.log(`${topic.title}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});