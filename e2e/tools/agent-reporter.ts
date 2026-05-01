import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * AgentReporter — produces an LLM-friendly `failure.md` per failed test plus a
 * consolidated `all-failures.md` at the root of `test-results/`.
 *
 * Each failure.md contains everything an agent needs to diagnose the failure
 * with a single Read:
 *   - Header: test title, file:line, duration, retry
 *   - Errors: message + stack from `result.errors`
 *   - Action history: flattened test.step timeline with pass/fail markers
 *   - DOM snapshot: inlined contents of Playwright's `error-context.md`
 *   - Browser console: contents of the `browser-console.log` attachment (if any)
 *   - Network failures: contents of the `network-errors.log` attachment (if any)
 *   - Screenshot reference: relative path to `test-failed-1.png`
 *
 * The reporter runs regardless of PW_LOG — it only reads what is already in
 * `TestResult`. The debug attachments only appear when the base fixture is
 * active (PW_LOG=1 or PW_PREVIEW=1).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_RESULTS_DIR = path.resolve(__dirname, '..', 'test-results');
const ALL_FAILURES_FILE = path.join(TEST_RESULTS_DIR, 'all-failures.md');
const SLOW_STEP_MS = 5_000;
const SOURCE_CONTEXT_LINES = 3;

interface FailureEntry {
  title: string;
  file: string;
  line: number;
  failureMdPath: string | null;
  shortError: string;
}

class AgentReporter implements Reporter {
  private readonly failures: FailureEntry[] = [];

  onBegin(): void {
    try {
      if (fs.existsSync(ALL_FAILURES_FILE)) {
        fs.unlinkSync(ALL_FAILURES_FILE);
      }
    } catch {
      /* ignore */
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'passed' || result.status === 'skipped') return;

    const outputDir = this.inferOutputDir(result);
    const shortError = stripAnsi(result.errors[0]?.message ?? '').split('\n')[0] ?? '';

    let failureMdPath: string | null = null;
    if (outputDir) {
      failureMdPath = path.join(outputDir, 'failure.md');
      try {
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(failureMdPath, this.renderFailure(test, result, outputDir));
      } catch {
        failureMdPath = null;
      }
    }

    this.failures.push({
      title: test.titlePath().slice(1).join(' > '),
      file: path.relative(process.cwd(), test.location.file),
      line: test.location.line,
      failureMdPath,
      shortError,
    });
  }

  async onEnd(_: FullResult): Promise<void> {
    if (this.failures.length === 0) return;
    const lines: string[] = [];
    lines.push(`# Playwright failures (${this.failures.length})`);
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(`| # | Test | Location | First error line | Details |`);
    lines.push(`|---|---|---|---|---|`);
    this.failures.forEach((f, i) => {
      const details = f.failureMdPath
        ? `[failure.md](${path.relative(TEST_RESULTS_DIR, f.failureMdPath)})`
        : '—';
      lines.push(
        `| ${i + 1} | ${escapePipe(f.title)} | \`${f.file}:${f.line}\` | ${escapePipe(
          truncate(f.shortError, 120),
        )} | ${details} |`,
      );
    });
    lines.push('');
    try {
      fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
      fs.writeFileSync(ALL_FAILURES_FILE, lines.join('\n'));
    } catch {
      /* ignore */
    }
  }

  private inferOutputDir(result: TestResult): string | null {
    for (const a of result.attachments) {
      if (a.path && typeof a.path === 'string') {
        return path.dirname(a.path);
      }
    }
    return null;
  }

  private renderFailure(test: TestCase, result: TestResult, outputDir: string): string {
    const lines: string[] = [];
    lines.push(`# Failure: ${test.titlePath().slice(1).join(' > ')}`);
    lines.push('');
    lines.push(`- **Status**: ${result.status}`);
    lines.push(`- **File**: \`${path.relative(process.cwd(), test.location.file)}:${test.location.line}\``);
    lines.push(`- **Duration**: ${(result.duration / 1000).toFixed(2)}s`);
    lines.push(`- **Retry**: ${result.retry}`);
    lines.push(`- **Worker**: ${result.workerIndex}`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push(`## Errors`);
      lines.push('');
      result.errors.forEach((err, i) => {
        lines.push(`### Error ${i + 1}`);
        lines.push('');
        lines.push('```');
        lines.push(stripAnsi(err.message ?? 'unknown error'));
        if (err.stack) {
          lines.push('');
          lines.push(stripAnsi(err.stack));
        }
        lines.push('```');
        lines.push('');
      });
    }

    const snippet = readSourceSnippet(test.location.file, test.location.line);
    if (snippet) {
      lines.push(`## Test source around line ${test.location.line}`);
      lines.push('');
      lines.push('```ts');
      lines.push(snippet);
      lines.push('```');
      lines.push('');
    }

    const att = indexAttachments(result);

    const timeline = buildTimeline(
      result,
      att.get('browser-console.log'),
      att.get('network-errors.log'),
    );
    if (timeline.length > 0) {
      lines.push(`## Unified timeline`);
      lines.push('');
      lines.push('Events from `result.steps`, `browser-console.log` and `network-errors.log` merged by timestamp. Use it to correlate test actions with browser events (e.g. assertion fired before network response settled).');
      lines.push('');
      lines.push('| Time | Kind | Event |');
      lines.push('|---|---|---|');
      for (const e of timeline) {
        const indent = e.kind === 'STEP' ? '&nbsp;'.repeat(e.depth * 2) : '';
        lines.push(`| \`${e.tsLabel}\` | ${e.icon} ${e.kind} | ${indent}${escapePipe(e.text)} |`);
      }
      lines.push('');
    }

    const errorContext = att.get('error-context');
    if (errorContext) {
      lines.push(`## DOM snapshot at failure`);
      lines.push('');
      lines.push(readAttachment(errorContext) ?? '_error-context unavailable_');
      lines.push('');
    }

    const browserConsole = att.get('browser-console.log');
    if (browserConsole) {
      const raw = readAttachment(browserConsole) ?? '';
      lines.push(`## Browser console (errors + warnings)`);
      lines.push('');
      lines.push('```');
      lines.push(dedupLines(raw));
      lines.push('```');
      lines.push('');
    }

    const networkErrors = att.get('network-errors.log');
    if (networkErrors) {
      lines.push(`## Network failures (4xx/5xx + failed requests)`);
      lines.push('');
      lines.push('```');
      lines.push(readAttachment(networkErrors) ?? '');
      lines.push('```');
      lines.push('');
    }

    const screenshot = att.get('screenshot');
    if (screenshot?.path) {
      const rel = path.relative(outputDir, screenshot.path);
      lines.push(`## Screenshot`);
      lines.push('');
      lines.push(`![Failure screenshot](${rel})`);
      lines.push('');
    }

    const trace = att.get('trace');
    if (trace?.path) {
      const rel = path.relative(outputDir, trace.path);
      lines.push(`## Trace (human follow-up)`);
      lines.push('');
      lines.push(`Open with: \`npx playwright show-trace ${rel}\``);
      lines.push('');
    }

    return lines.join('\n');
  }
}

type Attachment = TestResult['attachments'][number];

function indexAttachments(result: TestResult): Map<string, Attachment> {
  const map = new Map<string, Attachment>();
  for (const a of result.attachments) {
    if (!map.has(a.name)) map.set(a.name, a);
  }
  return map;
}

function readAttachment(a: Attachment): string | null {
  if (a.body) {
    return Buffer.isBuffer(a.body) ? a.body.toString('utf-8') : String(a.body);
  }
  if (a.path) {
    try {
      return fs.readFileSync(a.path, 'utf-8');
    } catch {
      return null;
    }
  }
  return null;
}

interface FlatStep {
  title: string;
  startTime: Date;
  duration: number;
  error: unknown;
  depth: number;
}

function flattenSteps(steps: readonly TestStep[], depth = 0): FlatStep[] {
  const out: FlatStep[] = [];
  for (const step of steps) {
    // Include user `test.step(...)` calls and top-level expect/api actions
    if (step.category === 'test.step' || step.category === 'expect' || step.category === 'pw:api') {
      out.push({
        title: step.title,
        startTime: step.startTime,
        duration: step.duration,
        error: step.error,
        depth,
      });
    }
    if (step.steps && step.steps.length > 0) {
      out.push(...flattenSteps(step.steps, depth + 1));
    }
  }
  return out;
}

interface TimelineEntry {
  ts: number; // epoch ms for sorting
  tsLabel: string; // HH:MM:SS.mmm
  icon: string;
  kind: 'STEP' | 'CONSOLE' | 'NETWORK';
  text: string;
  depth: number;
}

function buildTimeline(
  result: TestResult,
  consoleAtt: Attachment | undefined,
  networkAtt: Attachment | undefined,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Steps
  for (const s of flattenSteps(result.steps)) {
    const slow = !s.error && s.duration >= SLOW_STEP_MS ? ' ⚠️ SLOW' : '';
    entries.push({
      ts: s.startTime.getTime(),
      tsLabel: formatTimeOfDay(s.startTime),
      icon: s.error ? '✗' : '✓',
      kind: 'STEP',
      text: `${s.title} — ${s.duration}ms${s.error ? ' FAILED' : ''}${slow}`,
      depth: s.depth,
    });
  }

  // Console / network — anchor parsed HH:MM:SS.mmm to the test start date
  const anchor = result.startTime;
  for (const raw of readAttachmentLines(consoleAtt)) {
    const parsed = parseTimestampedLine(raw, anchor);
    if (!parsed) continue;
    const icon = /\b(pageerror|error)\b/.test(parsed.text) ? '❌' : '⚠️';
    entries.push({
      ts: parsed.ts,
      tsLabel: parsed.tsLabel,
      icon,
      kind: 'CONSOLE',
      text: collapseNewlines(parsed.text),
      depth: 0,
    });
  }
  for (const raw of readAttachmentLines(networkAtt)) {
    const parsed = parseTimestampedLine(raw, anchor);
    if (!parsed) continue;
    entries.push({
      ts: parsed.ts,
      tsLabel: parsed.tsLabel,
      icon: '❌',
      kind: 'NETWORK',
      text: collapseNewlines(parsed.text),
      depth: 0,
    });
  }

  // Stable sort by ts (Array.prototype.sort is stable in modern V8)
  entries.sort((a, b) => a.ts - b.ts);
  return entries;
}

function readAttachmentLines(a: Attachment | undefined): string[] {
  if (!a) return [];
  const text = readAttachment(a);
  if (!text) return [];
  // Network body lines start with `[status] METHOD url` then optional `  body: ...` continuation
  // Treat a line without timestamp prefix as continuation of the previous entry.
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if (TIMESTAMP_PREFIX.test(line) || out.length === 0) {
      out.push(line);
    } else {
      out[out.length - 1] += '\n' + line;
    }
  }
  return out.filter((l) => l.length > 0);
}

function parseTimestampedLine(
  line: string,
  anchor: Date,
): { ts: number; tsLabel: string; text: string } | null {
  const m = line.match(/^\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\] ([\s\S]*)$/);
  if (!m) return null;
  const [, h, min, s, ms, rest] = m;
  const d = new Date(anchor);
  d.setUTCHours(Number(h), Number(min), Number(s), Number(ms));
  return { ts: d.getTime(), tsLabel: `${h}:${min}:${s}.${ms}`, text: rest };
}

function formatTimeOfDay(d: Date): string {
  return d.toISOString().slice(11, 23);
}

function collapseNewlines(s: string): string {
  // Table cells can't contain raw newlines — render as `↵` so multi-line body excerpts stay on one row
  return s.replace(/\n+/g, ' ↵ ');
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}

function readSourceSnippet(file: string, line: number): string | null {
  try {
    const src = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
    const start = Math.max(0, line - 1 - SOURCE_CONTEXT_LINES);
    const end = Math.min(src.length, line + SOURCE_CONTEXT_LINES);
    const width = String(end).length;
    const out: string[] = [];
    for (let i = start; i < end; i++) {
      const n = String(i + 1).padStart(width, ' ');
      const marker = i + 1 === line ? '>' : ' ';
      out.push(`${marker} ${n} | ${src[i]}`);
    }
    return out.join('\n');
  } catch {
    return null;
  }
}

// Strip leading `[HH:MM:SS.mmm] ` timestamp so dedup compares message content.
const TIMESTAMP_PREFIX = /^\[\d{2}:\d{2}:\d{2}\.\d{3}\] /;

function dedupLines(raw: string): string {
  if (!raw) return '';
  const lines = raw.split('\n');
  const out: string[] = [];
  let prevKey: string | null = null;
  let firstLine: string | null = null;
  let count = 0;
  const flush = () => {
    if (firstLine === null) return;
    out.push(count > 1 ? `${firstLine}  [×${count}]` : firstLine);
  };
  for (const line of lines) {
    const key = line.replace(TIMESTAMP_PREFIX, '');
    if (key === prevKey) {
      count++;
    } else {
      flush();
      prevKey = key;
      firstLine = line;
      count = 1;
    }
  }
  flush();
  return out.join('\n');
}

function escapePipe(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export default AgentReporter;
