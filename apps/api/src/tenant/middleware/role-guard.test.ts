import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERMISSION_MATRIX } from './role-guard.js';

function listTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) return listTypeScriptFiles(fullPath);
    if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) return [fullPath];
    return [];
  });
}

describe('roleGuard module slugs', () => {
  it('keeps every route guard slug in the permission matrix', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const routesDir = join(currentDir, '..', 'routes');
    const knownModules = new Set(Object.keys(PERMISSION_MATRIX));

    const missing = listTypeScriptFiles(routesDir).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return Array.from(source.matchAll(/roleGuard\(['"`]([^'"`]+)['"`]\s*,/g))
        .map((match) => match[1])
        .filter((module) => !knownModules.has(module))
        .map((module) => `${module} in ${file}`);
    });

    expect(missing).toEqual([]);
  });
});
