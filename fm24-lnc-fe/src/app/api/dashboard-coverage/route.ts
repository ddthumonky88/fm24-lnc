import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

type LeagueCoverage = {
  id?: string;
  name: string;
  completed: number;
  total: number;
  coverage: number;
};

type NationCoverage = {
  code: string;
  name: string;
  confederation: string;
  completed: number;
  total: number;
  missing: number;
  coverage: number;
  leagues: LeagueCoverage[];
};

function parseLeagues(value: string): LeagueCoverage[] {
  const leagues: LeagueCoverage[] = [];
  const expression = /`(?:\[([^\]]+)\]\s*)?([^`]+)`\s*\((\d+)\/(\d+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = expression.exec(value)) !== null) {
    const completed = Number(match[3]);
    const total = Number(match[4]);
    leagues.push({
      ...(match[1] ? { id: match[1] } : {}),
      name: match[2].trim(),
      completed,
      total,
      coverage: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
    });
  }

  return leagues;
}

function parseChecklist(content: string): NationCoverage[] {
  const nations: NationCoverage[] = [];

  for (const line of content.split(/\r?\n/)) {
    if (!line.startsWith('|') || !line.includes('**[')) continue;

    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 7) continue;

    const nationMatch = cells[2].match(/\*\*\[([^\]]+)\]\s+(.+?)\*\*/);
    const totalsMatch = cells[3].match(/(\d[\d,]*)\s*\/\s*(\d[\d,]*)/);
    if (!nationMatch || !totalsMatch) continue;

    const completed = Number(totalsMatch[1].replaceAll(',', ''));
    const total = Number(totalsMatch[2].replaceAll(',', ''));
    nations.push({
      code: nationMatch[1],
      name: nationMatch[2],
      confederation: cells[1],
      completed,
      total,
      missing: Math.max(total - completed, 0),
      coverage: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
      leagues: parseLeagues(cells[6]),
    });
  }

  return nations.sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET() {
  const candidates = [
    path.resolve(process.cwd(), '..', 'CHECKLIST.md'),
    path.resolve(process.cwd(), 'CHECKLIST.md'),
  ];

  for (const checklistPath of candidates) {
    try {
      const content = await readFile(checklistPath, 'utf8');
      return NextResponse.json({ nations: parseChecklist(content) });
    } catch {
      // Try the next location so this works when Next is started from the repo root or FE folder.
    }
  }

  return NextResponse.json(
    { message: 'Không tìm thấy CHECKLIST.md để tạo dữ liệu dashboard.' },
    { status: 404 },
  );
}
