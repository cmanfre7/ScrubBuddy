// UWorld Test Results Scraper for ScrubBuddy
// Run this script in your browser console while on a UWorld Test Results page

(async function() {
  const SCRUBBUDDY_URL = 'https://scrubbuddy-production.up.railway.app'; // Change this to your URL

  console.log('🔍 ScrubBuddy UWorld Scraper Starting...');

  // Get test name from page
  const testNameEl = document.querySelector('h1, [class*="test-name"], [class*="TestName"]');
  let testName = testNameEl ? testNameEl.textContent.trim() : 'Unknown Test';

  // Try to get from the page title or header
  if (testName === 'Unknown Test' || testName.length < 3) {
    const headerText = document.body.innerText.match(/Test Name:\s*(.+?)(?:\n|$)/i);
    if (headerText) testName = headerText[1].trim();
  }

  // Get Custom Test Id
  let testId = '';
  const testIdMatch = document.body.innerText.match(/Custom Test Id[:\s]*(\d+)/i);
  if (testIdMatch) testId = testIdMatch[1];

  // Get score
  let score = 0;
  const scoreMatch = document.body.innerText.match(/(\d+)%/);
  if (scoreMatch) score = parseInt(scoreMatch[1]);

  console.log(`📋 Test: ${testName}`);
  console.log(`🆔 Test ID: ${testId}`);
  console.log(`📊 Score: ${score}%`);

  // Find all question rows
  const questions = [];

  // Method 1: Look for table rows with question data
  const rows = document.querySelectorAll('tr, [class*="row"], [class*="Row"], [class*="question"], [class*="Question"]');

  rows.forEach((row, index) => {
    const text = row.textContent || '';

    // Skip header rows
    if (text.includes('SUBJECTS') || text.includes('SYSTEMS') || text.includes('ID')) return;

    // Look for question ID pattern (number - number like "1 - 118154")
    const idMatch = text.match(/(\d+)\s*[-–]\s*(\d{5,})/);
    if (!idMatch) return;

    const questionId = idMatch[2];

    // Determine if correct or incorrect
    // Look for checkmark (✓, ✔) or X (×, ✗, ✘)
    const isCorrect = row.querySelector('[class*="correct"], [class*="Correct"], svg[class*="check"]') !== null ||
                      text.includes('✓') || text.includes('✔') ||
                      row.innerHTML.includes('check') || row.innerHTML.includes('correct');

    const isIncorrect = row.querySelector('[class*="incorrect"], [class*="Incorrect"], [class*="wrong"], svg[class*="x"], svg[class*="close"]') !== null ||
                        text.includes('×') || text.includes('✗') || text.includes('✘') ||
                        row.innerHTML.includes('times') || row.innerHTML.includes('wrong');

    // Get cell values
    const cells = row.querySelectorAll('td, [class*="cell"], [class*="Cell"]');
    const cellTexts = Array.from(cells).map(c => c.textContent.trim());

    // Also try splitting by common delimiters
    const parts = text.split(/\t|\s{2,}/).map(s => s.trim()).filter(s => s);

    // Try to extract data
    let subject = '', system = '', category = '', topic = '', percentOthers = 0, timeSpent = 0;

    // Look for percentage (ends with %)
    const percentMatch = text.match(/(\d+)%/g);
    if (percentMatch && percentMatch.length > 0) {
      // First percentage might be the "% Correct Others"
      percentOthers = parseInt(percentMatch[0]);
    }

    // Look for time (ends with "sec")
    const timeMatch = text.match(/(\d+)\s*sec/i);
    if (timeMatch) {
      timeSpent = parseInt(timeMatch[1]);
    }

    // Try to identify subject (common UWorld subjects)
    const subjects = ['OBGYN', 'Surgery', 'Medicine', 'Pediatrics', 'Psychiatry', 'Neurology', 'Family Medicine', 'Emergency Medicine'];
    for (const s of subjects) {
      if (text.includes(s)) {
        subject = s;
        break;
      }
    }

    // Extract system and topic from the row text
    // Common patterns: "Pregnancy, Childbirth & Pue..." "Female Reproductive Syste..."
    const systemMatch = text.match(/(Pregnancy|Female|Male|Cardiovascular|Respiratory|Gastrointestinal|Renal|Endocrine|Hematology|Musculoskeletal|Nervous|Skin|Immune)[^,]*/i);
    if (systemMatch) system = systemMatch[0].trim();

    // Look for category/topic patterns
    const categoryMatch = text.match(/(Disorders of|Diseases of|Infections|Tumors|Trauma|Congenital|Normal)[^,]*/i);
    if (categoryMatch) category = categoryMatch[0].trim();

    // Topic is often the last meaningful text before the percentages
    const topicMatch = text.match(/([A-Z][a-z]+(?:\s+[a-z]+)*)\s+\d+%/);
    if (topicMatch) topic = topicMatch[1].trim();

    // Only add if we found a valid question ID
    if (questionId && questionId.length >= 5) {
      questions.push({
        questionId,
        isCorrect: isCorrect && !isIncorrect,
        subject: subject || 'Unknown',
        system: system || 'Unknown',
        category: category || 'Unknown',
        topic: topic || 'Unknown',
        percentOthers,
        timeSpent
      });
    }
  });

  // Deduplicate by questionId
  const uniqueQuestions = [];
  const seenIds = new Set();
  for (const q of questions) {
    if (!seenIds.has(q.questionId)) {
      seenIds.add(q.questionId);
      uniqueQuestions.push(q);
    }
  }

  console.log(`📝 Found ${uniqueQuestions.length} questions`);
  console.log('Questions:', uniqueQuestions);

  if (uniqueQuestions.length === 0) {
    console.error('❌ No questions found. Make sure you are on the Test Results page with questions visible.');
    console.log('💡 Try scrolling to load all questions first, then run this script again.');
    return;
  }

  // Prompt user to confirm
  const correct = uniqueQuestions.filter(q => q.isCorrect).length;
  const incorrect = uniqueQuestions.filter(q => !q.isCorrect).length;

  const confirmMsg = `Found ${uniqueQuestions.length} questions (${correct} correct, ${incorrect} incorrect).\n\nTest: ${testName}\n\nSend to ScrubBuddy?`;

  if (!confirm(confirmMsg)) {
    console.log('❌ Cancelled by user');
    return;
  }

  // Send to ScrubBuddy
  console.log('📤 Sending to ScrubBuddy...');

  try {
    const response = await fetch(`${SCRUBBUDDY_URL}/api/uworld/import-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        testName,
        testId,
        score,
        questions: uniqueQuestions
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Success!', result);
      alert(`✅ Successfully imported!\n\n${result.stats.totalQuestions} questions\n${result.stats.totalCorrect} correct (${result.stats.percentCorrect}%)\n${result.stats.incorrectsSaved} incorrect questions saved for review`);
    } else {
      console.error('❌ Error:', result);
      alert(`❌ Error: ${result.error || 'Unknown error'}\n\nMake sure you're logged into ScrubBuddy first!`);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    alert(`❌ Network error. Make sure:\n1. You're logged into ScrubBuddy\n2. ScrubBuddy is running\n\nError: ${error.message}`);
  }
})();
