import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const timeoutMs = 45_000;
const failures = [];
const warnings = [];
const results = [];

const profiles = [
  { grade: 9 },
  { grade: 10 },
  { grade: 11, stream: 'Natural' },
  { grade: 11, stream: 'Social' },
  { grade: 12, stream: 'Natural' },
  { grade: 12, stream: 'Social' },
];

function envValue(source, name) {
  const match = source.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm'));
  return (match?.[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
}

function profileName(profile) {
  return `Grade ${profile.grade}${profile.stream ? ` ${profile.stream}` : ''}`;
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  values.forEach((value) => {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  });
  return [...repeated];
}

function fail(profile, message) {
  failures.push(`${profileName(profile)}: ${message}`);
}

async function request(action, payload, apiUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
    const envelope = await response.json();
    return {
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      envelope,
    };
  } catch (error) {
    return {
      status: 0,
      elapsedMs: Date.now() - startedAt,
      error: error?.name === 'AbortError' ? 'timed out' : 'request failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

const apiUrl = envValue(readFileSync(resolve(root, '.env'), 'utf8'), 'EXPO_PUBLIC_APPS_SCRIPT_URL');
if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(apiUrl)) {
  process.stderr.write('FAIL  The production Apps Script endpoint is missing or invalid.\n');
  process.exit(1);
}

for (const profile of profiles) {
  const profileFailureStart = failures.length;
  const response = await request('catalog', profile, apiUrl);
  const name = profileName(profile);
  if (response.status !== 200 || response.envelope?.ok !== true) {
    fail(profile, `${response.error ?? 'catalog request failed'} after ${response.elapsedMs} ms.`);
    process.stderr.write(`FAIL  ${name} catalog (${response.elapsedMs} ms).\n`);
    continue;
  }

  const data = response.envelope.data ?? {};
  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  const units = Array.isArray(data.units) ? data.units : [];
  const announcements = Array.isArray(data.announcements) ? data.announcements : null;
  const subjectIds = new Set(subjects.map((subject) => String(subject.id ?? '')));

  if (!subjects.length) fail(profile, 'no active subjects were returned.');
  if (!units.length) fail(profile, 'no active units were returned.');
  if (announcements === null) fail(profile, 'announcements was not an array.');

  const duplicateSubjectIds = duplicates(subjects.map((subject) => String(subject.id ?? '')));
  const duplicateUnitIds = duplicates(units.map((unit) => String(unit.id ?? '')));
  if (duplicateSubjectIds.length) fail(profile, `duplicate subject IDs: ${duplicateSubjectIds.join(', ')}.`);
  if (duplicateUnitIds.length) fail(profile, `duplicate unit IDs: ${duplicateUnitIds.join(', ')}.`);

  subjects.forEach((subject) => {
    if (!subject.id || !subject.name) fail(profile, 'a subject is missing its ID or name.');
    if (Number(subject.grade) !== profile.grade) fail(profile, `subject ${subject.id} belongs to Grade ${subject.grade}.`);
    if (profile.stream && subject.stream !== profile.stream) {
      fail(profile, `subject ${subject.id} belongs to stream ${subject.stream ?? 'blank'}.`);
    }
  });

  units.forEach((unit) => {
    if (!unit.id || !unit.title) fail(profile, 'a unit is missing its ID or title.');
    if (!subjectIds.has(String(unit.subjectId ?? ''))) {
      fail(profile, `unit ${unit.id ?? 'unknown'} references unavailable subject ${unit.subjectId ?? 'blank'}.`);
    }
    if (!Number.isFinite(Number(unit.number)) || Number(unit.number) < 1) {
      fail(profile, `unit ${unit.id ?? 'unknown'} has invalid unit number ${unit.number ?? 'blank'}.`);
    }
    if (!['free', 'premium'].includes(unit.accessTier)) {
      fail(profile, `unit ${unit.id ?? 'unknown'} has invalid access tier ${unit.accessTier ?? 'blank'}.`);
    }
    if (!Number.isFinite(Number(unit.questionCount)) || Number(unit.questionCount) < 0) {
      fail(profile, `unit ${unit.id ?? 'unknown'} has an invalid question count.`);
    } else if (Number(unit.questionCount) === 0) {
      warnings.push(`${name}: ${unit.id} is published with zero questions.`);
    }
  });

  let sampledQuestions = 0;
  const preferredSubject = subjects.find((subject) => /math/i.test(String(subject.name))) ?? subjects[0];
  const freeUnit = units.find((unit) => unit.subjectId === preferredSubject?.id && unit.accessTier === 'free')
    ?? units.find((unit) => unit.accessTier === 'free');
  if (!freeUnit && units.length) {
    fail(profile, 'no free unit is available for public first-use validation.');
  } else if (freeUnit) {
    const questionResponse = await request('questions', {
      unitId: freeUnit.id,
      subjectId: freeUnit.subjectId,
      version: freeUnit.version,
    }, apiUrl);
    if (questionResponse.status !== 200 || questionResponse.envelope?.ok !== true) {
      fail(profile, `free-unit question request for ${freeUnit.id} failed after ${questionResponse.elapsedMs} ms.`);
    } else {
      const questions = questionResponse.envelope.data?.questions;
      if (!Array.isArray(questions) || !questions.length) {
        fail(profile, `free unit ${freeUnit.id} returned no questions.`);
      } else {
        sampledQuestions = questions.length;
        const duplicateQuestionIds = duplicates(questions.map((question) => String(question.id ?? '')));
        if (duplicateQuestionIds.length) {
          fail(profile, `free unit ${freeUnit.id} has duplicate question IDs: ${duplicateQuestionIds.join(', ')}.`);
        }
        if (Number(freeUnit.questionCount) !== questions.length) {
          fail(profile, `free unit ${freeUnit.id} advertises ${freeUnit.questionCount} questions but returned ${questions.length}.`);
        }
        questions.forEach((question) => {
          if (!question.id || !String(question.prompt ?? '').trim()) {
            fail(profile, `free unit ${freeUnit.id} contains a question without an ID or prompt.`);
          }
          if (question.unitId !== freeUnit.id) {
            fail(profile, `question ${question.id ?? 'unknown'} references unit ${question.unitId ?? 'blank'}.`);
          }
          if (!Array.isArray(question.options) || question.options.length !== 4
            || question.options.some((option) => !String(option ?? '').trim())) {
            fail(profile, `question ${question.id ?? 'unknown'} does not contain four complete options.`);
          } else if (new Set(question.options.map((option) => String(option).trim())).size !== 4) {
            fail(profile, `question ${question.id ?? 'unknown'} contains duplicate option text.`);
          }
          if (![0, 1, 2, 3].includes(question.correctAnswer)) {
            fail(profile, `question ${question.id ?? 'unknown'} has invalid correct-answer index ${question.correctAnswer}.`);
          }
          if (!String(question.explanation ?? '').trim()) {
            fail(profile, `question ${question.id ?? 'unknown'} has no explanation.`);
          }
          const visibleText = [question.prompt, ...(question.options ?? []), question.explanation].join(' ');
          if (/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2}\b/.test(visibleText)) {
            fail(profile, `question ${question.id ?? 'unknown'} contains a spreadsheet date-conversion artifact.`);
          }
        });
      }
    }
  }

  results.push({
    ...profile,
    passed: failures.length === profileFailureStart,
    subjects: subjects.length,
    units: units.length,
    freeUnits: units.filter((unit) => unit.accessTier === 'free').length,
    premiumUnits: units.filter((unit) => unit.accessTier === 'premium').length,
    questions: units.reduce((total, unit) => total + (Number(unit.questionCount) || 0), 0),
    announcements: announcements?.length ?? 0,
    sampledQuestions,
    elapsedMs: response.elapsedMs,
  });
  const status = failures.length === profileFailureStart ? 'PASS' : 'FAIL';
  process.stdout.write(
    `${status}  ${name}: ${subjects.length} subjects, ${units.length} units, `
      + `${units.reduce((total, unit) => total + (Number(unit.questionCount) || 0), 0)} published questions, `
      + `${sampledQuestions} live questions checked (${response.elapsedMs} ms catalog).\n`,
  );
}

warnings.forEach((message) => process.stdout.write(`WARN  ${message}\n`));
failures.forEach((message) => process.stderr.write(`FAIL  ${message}\n`));
const passedProfiles = results.filter((result) => result.passed).length;
process.stdout.write(`\n${results.length}/${profiles.length} production profiles responded; ${passedProfiles} populated profiles were sampled; ${failures.length} failures, ${warnings.length} warnings.\n`);
if (failures.length) process.exitCode = 1;
