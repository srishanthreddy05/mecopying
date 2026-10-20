// End-to-end integration test runner for Mecopying.in
import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("🚀 Starting E2E verification of Mecopying.in...\n");

  // 1. Test Slug Availability Check
  console.log("TEST 1: Slug availability check...");
  const resReserved = await fetch(`${BASE_URL}/api/slug-check?type=collection&slug=admin`);
  const dataReserved = await resReserved.json();
  assert.strictEqual(dataReserved.available, false, "Reserved slug 'admin' must not be available");
  assert.match(dataReserved.error, /reserved/i, "Reserved error message must be returned");

  const testColSlug = `student-${Date.now().toString(36)}`;
  const resAvail = await fetch(`${BASE_URL}/api/slug-check?type=collection&slug=${testColSlug}`);
  const dataAvail = await resAvail.json();
  assert.strictEqual(dataAvail.available, true, `New slug ${testColSlug} must be available`);
  console.log("  ✔ Slug check passed (reserved rejected, fresh accepted)\n");

  // 2. Test Collection & Initial Snippet Creation
  console.log("TEST 2: Create collection with initial snippet...");
  const createColRes = await fetch(`${BASE_URL}/api/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionSlug: testColSlug,
      collection: {
        title: "CS 101 Lab Solutions",
        description: "Official lab solutions for week 1 and 2",
        visibility: "PUBLIC",
      },
      snippet: {
        slug: "week1",
        title: "Hello World in Python",
        content: "print('Hello, Mecopying!')\nfor i in range(5):\n    print(i)",
        language: "python",
        visibility: "PUBLIC",
      },
    }),
  });

  assert.strictEqual(createColRes.status, 201, "Collection creation must return 201 Created");
  const createdData = await createColRes.json();
  assert(createdData.manageToken, "Must return private management token");
  assert(createdData.urls.manageUrl, "Must return private management URL");
  assert(createdData.urls.snippetUrl, "Must return public snippet URL");
  const manageToken = createdData.manageToken;
  console.log(`  ✔ Created collection /${testColSlug} with snippet /week1`);
  console.log(`  ✔ Received manage token: ${manageToken.substring(0, 10)}... (token hash stored in DB)\n`);

  // 3. Test Duplicate Slug Rejection (PostgreSQL unique constraint check)
  console.log("TEST 3: Duplicate slug rejection...");
  const dupRes = await fetch(`${BASE_URL}/api/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionSlug: testColSlug,
      collection: { title: "Duplicate Attempt", visibility: "PUBLIC" },
    }),
  });
  assert.strictEqual(dupRes.status, 409, "Duplicate slug must return 409 Conflict");
  const dupData = await dupRes.json();
  assert.match(dupData.error, /already/i, "Error message must state slug is already taken");
  console.log("  ✔ Duplicate slug rejected with 409 Conflict\n");

  // 4. Test Adding a Second Snippet to the Same Collection (using management token)
  console.log("TEST 4: Add second snippet to same collection...");
  // First, verify that invalid token is rejected
  const badTokenRes = await fetch(`${BASE_URL}/api/snippets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionSlug: testColSlug,
      slug: "week2",
      title: "QuickSort in TypeScript",
      content: "function quickSort(arr: number[]): number[] { return arr; }",
      language: "typescript",
      visibility: "UNLISTED",
      manageToken: "invalid_token_1234567890",
    }),
  });
  assert.strictEqual(badTokenRes.status, 401, "Invalid management token must return 401 Unauthorized");

  // Now with valid management token
  const validTokenRes = await fetch(`${BASE_URL}/api/snippets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionSlug: testColSlug,
      slug: "week2",
      title: "QuickSort in TypeScript",
      content: "function quickSort(arr: number[]): number[] { return arr; }",
      language: "typescript",
      visibility: "UNLISTED",
      manageToken: manageToken,
    }),
  });
  assert.strictEqual(validTokenRes.status, 201, "Valid token must create snippet in collection");
  console.log(`  ✔ Unauthorized creation rejected (401), Authorized creation succeeded (201)\n`);

  // 5. Test Direct Snippet Retrieval & Visibility
  console.log("TEST 5: Direct snippet retrieval and public collection listing...");
  // Fetch /week1 (Public)
  const snip1Res = await fetch(`${BASE_URL}/api/snippets/${testColSlug}/week1`);
  assert.strictEqual(snip1Res.status, 200, "Public snippet must return 200");
  const snip1Data = await snip1Res.json();
  assert.strictEqual(snip1Data.snippet.title, "Hello World in Python");

  // Fetch /week2 (Unlisted) directly
  const snip2Res = await fetch(`${BASE_URL}/api/snippets/${testColSlug}/week2`);
  assert.strictEqual(snip2Res.status, 200, "Unlisted snippet must be accessible via direct URL");
  const snip2Data = await snip2Res.json();
  assert.strictEqual(snip2Data.snippet.visibility, "UNLISTED");

  // Check public collection listing page (HTML)
  const colPageRes = await fetch(`${BASE_URL}/${testColSlug}`);
  assert.strictEqual(colPageRes.status, 200, "Collection page must return 200 OK");
  const colHtml = await colPageRes.text();
  assert(colHtml.includes("Hello World in Python") || colHtml.includes("week1"), "Public snippet must appear in collection / shared page");
  assert(!colHtml.includes("week2") && !colHtml.includes("QuickSort"), "Unlisted snippet must NOT appear in public collection / shared page");
  console.log("  ✔ Public snippet visible in collection, Unlisted snippet hidden from listing\n");

  // 6. Test Snippet Edit & Delete through Management Token
  console.log("TEST 6: Update snippet with management credentials...");
  const editRes = await fetch(`${BASE_URL}/api/snippets/${testColSlug}/week1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manageToken: manageToken,
      title: "Hello World in Python (Updated v2)",
      content: "# Updated code\nprint('V2 updated!')",
    }),
  });
  assert.strictEqual(editRes.status, 200, "Snippet update must return 200 OK");

  // Verify the update
  const verifyRes = await fetch(`${BASE_URL}/api/snippets/${testColSlug}/week1`);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.snippet.title, "Hello World in Python (Updated v2)");
  assert.strictEqual(verifyData.snippet.content, "# Updated code\nprint('V2 updated!')");
  console.log("  ✔ Snippet successfully updated with management token\n");

  // 7. Test FutureMe: Locked vs Unlocked Time Enforcements
  console.log("TEST 7: FutureMe time-lock and content withholding...");
  // Create message unlocking 1 hour in the future
  const futureUnlock = new Date(Date.now() + 3600 * 1000).toISOString();
  const createFutureRes = await fetch(`${BASE_URL}/api/futureme`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Graduation Predictions 2027",
      hint: "To my future self",
      content: "SUPER_SECRET_FUTURE_MESSAGE_12345",
      unlockAt: futureUnlock,
    }),
  });
  assert.strictEqual(createFutureRes.status, 201, "FutureMe creation must return 201");
  const futureData = await createFutureRes.json();
  const futureSlug = futureData.message.slug;

  // Retrieve locked message
  const getLockedRes = await fetch(`${BASE_URL}/api/futureme/${futureSlug}`);
  const lockedData = await getLockedRes.json();
  assert.strictEqual(lockedData.message.isLocked, true, "Message must be flagged as locked");
  assert.strictEqual(lockedData.message.content, null, "Message content MUST be null/withheld before unlock time");

  // Check the HTML page of locked message
  const lockedHtmlRes = await fetch(`${BASE_URL}/futureme/${futureSlug}`);
  const lockedHtml = await lockedHtmlRes.text();
  assert(!lockedHtml.includes("SUPER_SECRET_FUTURE_MESSAGE_12345"), "Secret message body must NEVER leak into page HTML or script tags");
  console.log("  ✔ FutureMe content strictly withheld by server before unlock time\n");

  // 8. Test Content Abuse Reporting
  console.log("TEST 8: Abuse reporting endpoint...");
  const reportRes = await fetch(`${BASE_URL}/api/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetType: "SNIPPET",
      targetId: `${testColSlug}/week1`,
      reason: "Spam or phishing",
      details: "Automated test report submission",
    }),
  });
  assert.strictEqual(reportRes.status, 200, "Report endpoint must return 200 OK");
  console.log("  ✔ Abuse report submitted successfully\n");

  // 9. Test Static Tools and Pages
  console.log("TEST 9: Core navigation and tools pages...");
  const qrRes = await fetch(`${BASE_URL}/qr`);
  assert.strictEqual(qrRes.status, 200, "/qr page must return 200 OK");
  const futuremeRes = await fetch(`${BASE_URL}/futureme`);
  assert.strictEqual(futuremeRes.status, 200, "/futureme page must return 200 OK");
  const termsRes = await fetch(`${BASE_URL}/terms`);
  assert.strictEqual(termsRes.status, 200, "/terms page must return 200 OK");
  const privacyRes = await fetch(`${BASE_URL}/privacy`);
  assert.strictEqual(privacyRes.status, 200, "/privacy page must return 200 OK");
  const contactRes = await fetch(`${BASE_URL}/contact`);
  assert.strictEqual(contactRes.status, 200, "/contact page must return 200 OK");
  console.log("  ✔ All static and utility pages returned 200 OK\n");

  // 10. Test Simplified Page Creation (No language required, optional custom slug, deletion password)
  console.log("TEST 10: Simplified Page Creation with Deletion Password...");
  // 10a: Without custom slug (server generates random 8-char slug)
  const createAutoRes = await fetch(`${BASE_URL}/api/page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "My Random Paste",
      content: "const a = 10;\nconst b = 20;\nconsole.log(a + b);",
      deletePassword: "superSecretPassword123",
      expiry: "never",
    }),
  });
  assert.strictEqual(createAutoRes.status, 201, "Auto-slug page creation must return 201 Created");
  const autoPage = await createAutoRes.json();
  assert(autoPage.slug, "Must return generated slug");
  assert.strictEqual(autoPage.slug.length, 8, "Generated slug must be 8 characters long");
  assert.strictEqual(autoPage.deletePassword, undefined, "Password must never be returned");
  assert.strictEqual(autoPage.deletePasswordHash, undefined, "Password hash must never be returned");
  console.log(`  ✔ Successfully created page with random slug: /${autoPage.slug}`);

  // 10b: With custom slug
  const customSlug = `custom-${Date.now().toString(36)}`;
  const createCustomRes = await fetch(`${BASE_URL}/api/page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "My Custom Note",
      slug: customSlug,
      content: "Arbitrary plaintext, notes, configs\nNo language selection required!\n  Indented line 1\n  Indented line 2",
      deletePassword: "deleteMeLater456",
      expiry: "24h",
    }),
  });
  assert.strictEqual(createCustomRes.status, 201, "Custom slug page creation must return 201");
  const customPage = await createCustomRes.json();
  assert.strictEqual(customPage.slug, customSlug);
  console.log(`  ✔ Successfully created page with custom slug: /${customSlug}`);

  // 10c: Retrieve the created page HTML and verify no password hash leak
  const getPageRes = await fetch(`${BASE_URL}/${customSlug}`);
  assert.strictEqual(getPageRes.status, 200, "Shared page must return 200 OK");
  const pageHtml = await getPageRes.text();
  assert(pageHtml.includes("Arbitrary plaintext, notes, configs"), "Content must be rendered on page");
  assert(!pageHtml.includes("deleteMeLater456"), "Password must never leak in page HTML");
  console.log(`  ✔ Shared page rendered content cleanly with zero password leak\n`);

  // 11. Test Deletion Workflow (Secure password verification & removal)
  console.log("TEST 11: Deletion Workflow with Password Verification...");
  // 11a: Wrong password must be rejected with 403 Forbidden
  const wrongDeleteRes = await fetch(`${BASE_URL}/api/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: customSlug,
      password: "incorrectPassword!",
    }),
  });
  assert.strictEqual(wrongDeleteRes.status, 403, "Wrong password must return 403 Forbidden");
  const wrongData = await wrongDeleteRes.json();
  assert.match(wrongData.error, /incorrect/i, "Error message must state incorrect password");
  console.log("  ✔ Wrong password correctly rejected with 403 Forbidden");

  // Verify page still exists after failed deletion
  const checkStillThereRes = await fetch(`${BASE_URL}/${customSlug}`);
  assert.strictEqual(checkStillThereRes.status, 200, "Page must remain accessible after failed deletion attempt");

  // 11b: Correct password successfully deletes page
  const correctDeleteRes = await fetch(`${BASE_URL}/api/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: customSlug,
      password: "deleteMeLater456",
    }),
  });
  assert.strictEqual(correctDeleteRes.status, 200, "Correct password must return 200 OK");
  const correctData = await correctDeleteRes.json();
  assert.strictEqual(correctData.success, true);
  console.log("  ✔ Correct password successfully deleted page");

  // Verify page returns 404 now
  const checkDeletedRes = await fetch(`${BASE_URL}/${customSlug}`);
  assert.strictEqual(checkDeletedRes.status, 404, "Deleted page must return 404 Not Found");
  console.log("  ✔ Verified deleted page now returns 404 Not Found\n");

  console.log("🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("❌ E2E TEST FAILED:", err);
  process.exit(1);
});
