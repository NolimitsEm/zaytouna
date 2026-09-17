// Diagnostic only: exercise the current backend function bodies against fixtures.
// No backend import, environment loading, database access, SMTP, or Zoom requests.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {parse} from '@babel/parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.resolve(root, '../backend/server.js'), 'utf8');
const ast = parse(source, {sourceType: 'module'});
const functions = new Map(ast.program.body
  .filter(node => node.type === 'FunctionDeclaration')
  .map(node => [node.id.name, source.slice(node.start, node.end)]));
const names = [
  'safeJsonParse', 'jsonString', 'arrayFromStorageValue', 'objectFromStorageValue',
  'stateArray', 'idsMatch', 'itemId', 'itemTargetsStudent', 'publicAuthUser',
  'publicStateUser', 'roleScopedAppState', 'stateWriteAllowedForRole',
  'assertStateWritePermissions', 'mergeRoleScopedStateWrite', 'payloadFromRow',
  'mergeUserSecrets', 'replaceArrayState', 'cleanText', 'safeStoredUrl',
  'profileValidationError', 'updateOwnAvatar', 'createRequestHandler',
  'findZoomRecord', 'publicZoomRecordingRecord'
];
for (const name of names) assert.ok(functions.has(name), `Missing function ${name}`);
const unexpected = async () => { throw new Error('Unexpected external dependency in isolated review'); };
const realm = vm.createContext({
  URL, Buffer, console,
  readAppStateFromDatabase: unexpected,
  readUsersFromDatabase: unexpected,
  writeAppStateToDatabaseWithRetry: unexpected,
  findLoginUser: unexpected,
  rotateUserSession: unexpected,
  enqueueAppStateWrite: unexpected,
  loginLimiter: {},
  mutateUserAccessInDatabase: unexpected,
  authenticatedRequestUser: unexpected,
  readZoomRecordings: unexpected,
  refreshZoomRecording: unexpected,
  sendJson: (response, status, body) => Object.assign(response, {status, body}),
  markStateKeySaved: async () => {},
  arrayStateStores: {acceptedUsers: {
    table: 'users', insert: 'INSERT fixture user', values: user => [JSON.stringify(user)]
  }}
});
vm.runInContext(names.map(name => functions.get(name)).join('\n\n'), realm);
const report = {
  generatedAt: new Date().toISOString(),
  method: 'Actual backend function bodies extracted with Babel and run in a VM. Only data/network dependencies replaced with in-memory fixtures. These are bug-reproduction checks, not passing acceptance tests.',
  productionDataTouched: false,
  findings: []
};
const student = {id: 'student-fixture', role: 'student', niveauId: 'n1', groupeId: 'g1'};
const teacher = {id: 'teacher-fixture', role: 'teacher'};
const exam = {
  id: 'exam-fixture', teacherId: teacher.id, niveauId: 'n1', groupeId: 'g1',
  publishedToStudents: true, opensAt: '2099-01-01T09:00',
  questions: [{id: 'question-fixture', points: 20, correctAnswers: ['FIXTURE_CORRECT_ANSWER']}]
};
let current = {managedExams: JSON.stringify([exam]), acceptedUsers: JSON.stringify([student, teacher])};
realm.readAppStateFromDatabase = async () => structuredClone(current);
async function check(id, title, locations, reproduce) {
  const evidence = await reproduce();
  report.findings.push({id, severity: 'high', title, locations, reproduced: true, evidence});
  console.log(`REPRODUCED ${id}: ${title}`);
}

await check('R1', 'Student exam payload exposes correct answers before opening time', ['backend/server.js:1463', 'backend/server.js:1494'], async () => {
  const scoped = realm.roleScopedAppState(current, student);
  const exams = JSON.parse(scoped.managedExams);
  assert.equal(exams[0].questions[0].correctAnswers[0], 'FIXTURE_CORRECT_ANSWER');
  return {examCount: exams.length, containsCorrectAnswers: true, opensInFuture: true};
});

await check('R2', 'Student submission accepts client-supplied marks without validating the exam', ['backend/server.js:560', 'backend/server.js:539'], async () => {
  for (const examId of [exam.id, 'nonexistent-exam']) {
    const submission = {id: 'submission-fixture', userId: student.id, examId, awardedPoints: 20, totalPoints: 20, score: 20, correctionStatus: 'corrected', answers: []};
    const items = {examSubmissions: JSON.stringify([submission])};
    realm.assertStateWritePermissions(student, items);
    const result = await realm.mergeRoleScopedStateWrite(student, items);
    assert.deepEqual(JSON.parse(result.examSubmissions), [submission]);
  }
  return {acceptedFutureExam: true, acceptedNonexistentExam: true, acceptedUnverifiedScore: 20, acceptedEmptyAnswers: true};
});

await check('R3', 'Teacher can approve their own absence through the state API', ['backend/server.js:552', 'backend/server.js:512'], async () => {
  const absence = {id: 'absence-fixture', teacherId: teacher.id, scheduleId: 'schedule-fixture', status: 'pending'};
  current.teacherAbsences = JSON.stringify([absence]);
  const items = {teacherAbsences: JSON.stringify([{...absence, status: 'approved'}])};
  realm.assertStateWritePermissions(teacher, items);
  const result = await realm.mergeRoleScopedStateWrite(teacher, items);
  assert.equal(JSON.parse(result.teacherAbsences)[0].status, 'approved');
  return {actorRole: 'teacher', from: 'pending', to: 'approved', serverAccepted: true};
});

await check('R4', 'Concurrent avatar save can undo another account reactivation', ['backend/server.js:883', 'backend/server.js:893', 'backend/server.js:1273'], async () => {
  const owner = {id: 'avatar-owner', role: 'student', emailConfirmed: true, isDisabled: false};
  const victim = {id: 'reactivated-fixture', role: 'student', emailConfirmed: true, isDisabled: true};
  const snapshot = [owner, victim];
  let committed;
  realm.readUsersFromDatabase = async () => structuredClone(snapshot);
  realm.writeAppStateToDatabaseWithRetry = async (items, _attempts = 3, options = {}) => {
    // Admin reactivation commits after the avatar handler took its snapshot.
    const fresh = [owner, {...victim, isDisabled: false, sessionVersion: 1}];
    const connection = {query: async () => [fresh.map(user => ({payload: JSON.stringify(user)}))]};
    committed = await realm.mergeUserSecrets(connection, JSON.parse(items.acceptedUsers), options);
  };
  await realm.updateOwnAvatar(owner, 'data:image/png;base64,AQ==');
  assert.equal(committed.find(user => user.id === victim.id).isDisabled, true);
  return {adminCommittedIsDisabled: false, staleAvatarSaveIsDisabled: true, editedDifferentAccount: true};
});

await check('R5', 'Stale full-user save removes accounts added after its snapshot', ['backend/server.js:1265', 'backend/server.js:1280'], async () => {
  const oldUser = {id: 'old-fixture', role: 'student', emailConfirmed: true};
  const newUser = {id: 'new-fixture', role: 'student', emailConfirmed: true};
  let rows = [oldUser, newUser];
  let deletedWholeTable = false;
  const connection = {
    query: async sql => {
      if (sql.startsWith('SELECT payload')) return [rows.map(user => ({payload: JSON.stringify(user)}))];
      if (sql === 'DELETE FROM `users`') {rows = []; deletedWholeTable = true; return [{}];}
      throw new Error(`Unexpected fixture SQL: ${sql}`);
    },
    execute: async (_sql, [payload]) => { rows.push(JSON.parse(payload)); }
  };
  await realm.replaceArrayState(connection, 'acceptedUsers', JSON.stringify([oldUser]), {preserveUserSecurity: true});
  assert.equal(deletedWholeTable, true);
  assert.deepEqual(rows.map(user => user.id), [oldUser.id]);
  return {wholeTableReplacement: true, newerAccountLost: true, preserveUserSecurityEnabled: true};
});

await check('R6', 'Recording endpoint returns recording links without authentication', ['backend/server.js:2487', 'backend/server.js:2503'], async () => {
  realm.readZoomRecordings = async () => ({courses: {'course-fixture': {courseId: 'course-fixture', recordingVideoUrl: 'https://example.invalid/fixture-recording'}}, meetings: {}});
  const response = {};
  // No cookie, no refresh, and refreshZoomRecording is a fail-fast stub.
  await realm.createRequestHandler()({method: 'GET', url: '/api/zoom/recordings?courseId=course-fixture', headers: {}}, response);
  assert.equal(response.status, 200);
  assert.equal(response.body.recording.recordingVideoUrl, 'https://example.invalid/fixture-recording');
  return {cookiePresent: false, responseStatus: response.status, containsRecordingLink: true, remoteZoomCalled: false};
});

const destination = path.join(root, 'forensics/validation/review-findings.json');
fs.mkdirSync(path.dirname(destination), {recursive: true});
fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.findings.length} remaining issues reproduced; no production state modified.`);
