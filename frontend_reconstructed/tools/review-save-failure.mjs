// Browser diagnostic: fail only fixture API writes; never contact the real backend.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {root, output, serve, isolatedContext, ready, navigate} from '../tests/support.mjs';
import {defaultLevels, defaultGroups} from '../src/data/defaults.js';

const flags = Object.fromEntries(['correctedExamExamplesSeededV1', 'examCorrectionExamplesSeeded', 'ilyasCompletedSemesterWorkV1', 'ilyasDemoRestoredV1', 'questionnaireResultExamplesSeededV1'].map(key => [key, 'true']));
const baseline = {...flags, managedNiveaux: JSON.stringify(defaultLevels), managedGroupes: JSON.stringify(defaultGroups)};
const server = await serve(path.join(root, 'build'), 0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({channel: 'chrome', headless: true});
const report = {generatedAt: new Date().toISOString(), isolated: true, cases: []};
try {
  for (const [type, route, key] of [['level', 'levels', 'managedNiveaux'], ['group', 'groups', 'managedGroupes']]) {
    let rejectWrites = false;
    const {context, backend} = await isolatedContext(browser, 'admin', undefined, {
      state: structuredClone(baseline),
      respond({url, request, body}) {
        if (url.pathname !== '/api/app-state') return;
        if (request.method() === 'GET') return {status: 200, response: {state: baseline}};
        if (rejectWrites && body?.items?.[key]) return {status: 503, response: {error: 'Isolated review: save unavailable'}};
      }
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      await ready(page, origin + '/');
      await navigate(page, '#' + route);
      const name = 'REVIEW_UNSAVED_' + type;
      rejectWrites = true;
      const failedResponse = page.waitForResponse(response => response.url().endsWith('/api/app-state') && response.status() === 503);
      await page.locator(`[data-${type}-add-form] [name=name]`).fill(name);
      await page.locator(`[data-${type}-add-form]`).evaluate(form => form.requestSubmit());
      await failedResponse;
      await page.locator('.toast-error').first().waitFor();
      assert.equal(await page.locator(`table input[value="${name}"]`).count(), 0);
      assert.equal(await page.locator(`[data-${type}-add-form] [name=name]`).inputValue(), name);
      await page.reload({waitUntil: 'load'});
      await page.locator(`[data-${type}-add-form]`).waitFor();
      assert.equal(await page.locator(`table input[value="${name}"]`).count(), 0);
      assert.deepEqual(backend.errors, []);
      report.cases.push({type, fixed: true, failedStatus: 503, errorToastShown: true, unsavedRowRemainsUntilReload: false, formPreservedForRetry: true, absentAfterReload: true});
      console.log(`PASS ${type}: failed addition is rolled back and form input is preserved.`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(path.join(output, 'review-save-failure.json'), JSON.stringify(report, null, 2) + '\n');
}
