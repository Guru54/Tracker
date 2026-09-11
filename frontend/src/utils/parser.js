// Parse topics from AI response. JSON array of strings first (reliable,
// same reasoning as the question-content parser above) — falls back to the
// old comma/newline text parsing if the AI didn't return valid JSON.
export const parseTopicsFromAI = (text) => {
  if (!text || typeof text !== 'string') return [];

  const candidate = stripCodeFence(text);
  try {
    const arr = JSON.parse(candidate);
    if (Array.isArray(arr)) {
      const topics = arr
        .map(t => (typeof t === 'string' ? t : t?.name || t?.topic || ''))
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.length < 200);
      return [...new Set(topics)];
    }
  } catch {
    // Not valid JSON — fall back to comma/newline text parsing below.
  }

  return parseTopicsFromLegacyText(text);
};

const parseTopicsFromLegacyText = (text) => {
  // Remove markdown code blocks if present
  let cleanText = text.replace(/```[\s\S]*?```/g, '');

  // Remove bullet points, numbering, extra whitespace
  cleanText = cleanText
    .replace(/^[\s]*[-•*\d]+[.)]?[\s]*/gm, '')
    .replace(/^\s*Topic[s]?:?\s*/i, '')
    .replace(/^\s*Sub-topic[s]?:?\s*/i, '')
    .trim();

  // Split by comma or newline
  const topics = cleanText
    .split(/[,\n]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && t.length < 200)
    .map(t => t.replace(/^[\d]+[.)]?\s*/, ''))
    .filter(t => !t.toLowerCase().includes('here are') && !t.toLowerCase().includes('below'));

  return [...new Set(topics)]; // Remove duplicates
};

// Parse questions from AI response. JSON array of objects first — falls
// back to the old markdown-table parser, then the old numbered-list parser,
// if the AI didn't return valid JSON.
export const parseQuestionsFromAI = (text) => {
  if (!text || typeof text !== 'string') return [];

  const candidate = stripCodeFence(text);
  try {
    const arr = JSON.parse(candidate);
    if (Array.isArray(arr)) {
      const validDifficulties = ['Easy', 'Medium', 'Hard'];
      const questions = arr
        .map(item => {
          const title = (item.title || item.name || item.question || '').trim();
          const rawDiff = (item.difficulty || '').trim();
          const difficulty = validDifficulties.find(d =>
            rawDiff.toLowerCase().includes(d.toLowerCase())
          ) || 'Medium';
          const link = (item.link || item.url || '').trim();
          return {
            title,
            difficulty,
            link: link.startsWith('http') ? link : '',
            platform: detectPlatform(link),
            status: 'Not Started'
          };
        })
        .filter(q => q.title.length > 0);
      if (questions.length > 0) return questions;
    }
  } catch {
    // Not valid JSON — fall back to markdown-table / numbered-list parsing below.
  }

  const tableQuestions = parseQuestionsFromTable(text);
  if (tableQuestions.length > 0) return tableQuestions;
  return parseQuestionsFromText(text);
};

// Legacy fallback: markdown table for questions
export const parseQuestionsFromTable = (text) => {
  if (!text || typeof text !== 'string') return [];

  // Extract markdown table using regex
  const tableRegex = /\|([^\r\n|]+)\|([^\r\n|]+)\|([^\r\n|]+)\|/g;
  const matches = [...text.matchAll(tableRegex)];

  const questions = [];
  let isHeader = true;

  for (const match of matches) {
    const name = match[1].trim();
    const difficulty = match[2].trim();
    const url = match[3].trim();

    // Skip header row
    if (isHeader && (name.toLowerCase().includes('question') || name.toLowerCase().includes('name'))) {
      isHeader = false;
      continue;
    }

    if (!name || name.includes('--') || name.includes('==')) continue;

    // Validate difficulty
    const validDifficulties = ['Easy', 'Medium', 'Hard'];
    const normalizedDiff = validDifficulties.find(d => 
      difficulty.toLowerCase().includes(d.toLowerCase())
    ) || 'Medium';

    questions.push({
      title: name,
      difficulty: normalizedDiff,
      link: url.startsWith('http') ? url : '',
      platform: detectPlatform(url),
      status: 'Not Started'
    });
  }

  return questions;
};

// Legacy fallback: parse questions from a numbered-list format
export const parseQuestionsFromText = (text) => {
  if (!text || typeof text !== 'string') return [];

  // Try to extract table first
  const tableQuestions = parseQuestionsFromTable(text);
  if (tableQuestions.length > 0) return tableQuestions;

  // Fallback: Parse numbered list
  const lines = text.split('\n');
  const questions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match patterns like "1. Question Name - Easy - URL"
    const match = trimmed.match(/^\s*[\d]+[.)]?\s*(.+?)(?:\s*[-|]\s*(Easy|Medium|Hard))?(?:\s*[-|]\s*(https?:\/\/.+))?$/i);

    if (match) {
      questions.push({
        title: match[1].trim(),
        difficulty: match[2] || 'Medium',
        link: match[3] || '',
        platform: detectPlatform(match[3] || ''),
        status: 'Not Started'
      });
    }
  }

  return questions;
};

// Detect platform from URL. No URL = no basis to guess, so we say so
// explicitly instead of defaulting to LeetCode (previously every manually
// added no-link question was silently mislabeled "LeetCode").
const detectPlatform = (url) => {
  if (!url) return 'Manual';
  if (url.includes('leetcode')) return 'LeetCode';
  if (url.includes('geeksforgeeks') || url.includes('gfg')) return 'GFG';
  if (url.includes('codeforces')) return 'Codeforces';
  if (url.includes('hackerrank')) return 'HackerRank';
  return 'Other';
};

// Generate prompt for topics
export const generateTopicsPrompt = (subjectName) => {
  return `Act as an expert computer science instructor. List the most important sub-topics for "${subjectName}".

Return ONLY a valid JSON array of strings — no markdown code fences, no LaTeX or math syntax, no text before or after the array. Example shape:

["Topic One", "Topic Two", "Topic Three"]`;
};

// Generate prompt for questions
export const generateQuestionsPrompt = (topicName, count = 10) => {
  return `Act as a DSA expert. Provide ${count} standard practice questions for "${topicName}".

Return ONLY a valid JSON array of objects — no markdown code fences, no LaTeX or math syntax, no text before or after the array — with exactly this schema per item:

[
  { "title": "Question Name", "difficulty": "Easy | Medium | Hard", "link": "https://... (or empty string if unknown)" }
]`;
};

// Generate prompt for a single question's full content: problem statement +
// every distinct solving approach (brute force through optimal), each fully
// self-contained. Asks for strict JSON instead of Markdown headings —
// JSON.parse() is a 100% reliable boundary between fields, unlike regex over
// headings, and it lets us tell the AI to skip LaTeX delimiters ($, \ge,
// etc.) that look bad as raw text.
export const generateQuestionContentPrompt = (questionTitle) => {
  return `Act as a DSA expert. Explain the DSA problem "${questionTitle}", covering every meaningfully distinct approach from brute force to optimal.

Return ONLY a valid JSON object — no markdown code fences, no LaTeX (no $, no \\ge, no \\le, no math syntax of any kind; write complexities and math as plain ASCII like O(n log n)), no text before or after the JSON — with exactly this schema:

{
  "problemStatement": "The problem, restated clearly, in plain prose",
  "approaches": [
    {
      "title": "e.g. Brute Force / Better / Optimal",
      "intuition": "The key insight in a sentence or two",
      "explanation": "Step-by-step explanation of the approach, in plain prose",
      "code": "Complete working C++ code as a plain string (use \\n for newlines)",
      "timeComplexity": "O(...)",
      "spaceComplexity": "O(...)"
    }
  ],
  "keyPoints": "Important observations, edge cases, or gotchas, in plain text"
}`;
};

// Strip a ```json ... ``` or ``` ... ``` fence if the AI wrapped the JSON in one
// despite being asked not to.
const stripCodeFence = (text) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text.trim();
};

// A blank approach entry, shape-matched to the Question model's approaches[].
export const emptyApproach = () => ({
  title: '', intuition: '', explanation: '', code: '', timeComplexity: '', spaceComplexity: ''
});

// Primary content parser: JSON.parse on the AI's response. Reliable by
// construction — no regex guessing where one field ends and the next begins.
// Accepts the current multi-approach schema; also recognizes the old flat
// single-approach shape (approach/code/timeComplexity/spaceComplexity at the
// top level) and lifts it into a one-item approaches[] so older prompts/
// responses still parse into something usable. Falls back to the old
// "## Heading" markdown parser if the AI ignores the JSON instruction
// entirely, so a format drift degrades gracefully instead of losing the
// response.
export const parseQuestionContentResponse = (text) => {
  const empty = { problemStatement: '', approaches: [], notes: '' };
  if (!text || typeof text !== 'string') return empty;

  const candidate = stripCodeFence(text);
  try {
    const obj = JSON.parse(candidate);

    let approaches;
    if (Array.isArray(obj.approaches)) {
      approaches = obj.approaches.map(a => ({
        title: a?.title || '',
        intuition: a?.intuition || '',
        explanation: a?.explanation || a?.approach || '',
        code: a?.code || '',
        timeComplexity: a?.timeComplexity || a?.complexity?.time || '',
        spaceComplexity: a?.spaceComplexity || a?.complexity?.space || ''
      }));
    } else if (obj.approach || obj.code) {
      // Old flat single-approach shape — lift it into the array form.
      approaches = [{
        title: 'Approach 1',
        intuition: '',
        explanation: obj.approach || '',
        code: obj.code || '',
        timeComplexity: obj.timeComplexity || obj.complexity?.time || '',
        spaceComplexity: obj.spaceComplexity || obj.complexity?.space || ''
      }];
    } else {
      approaches = [];
    }

    return {
      problemStatement: obj.problemStatement || '',
      approaches,
      notes: obj.keyPoints || obj.notes || ''
    };
  } catch {
    // Not valid JSON — fall back to markdown-heading parsing below.
  }

  return parseQuestionContentFromMarkdown(text);
};

// Legacy fallback: splits on "## <Heading>" lines, in case the AI response
// wasn't valid JSON. Works on the old heading set (Approach/Code/Complexity/
// Key Points) and degrades gracefully — missing sections just come back
// empty, wrapped as a single approach so the shape still matches approaches[].
const parseQuestionContentFromMarkdown = (text) => {
  const sections = {};
  const headingRe = /^#{1,3}\s*(Approach|Code(?:\s*\([^)]*\))?|Complexity|Key Points?)\s*$/gim;
  const matches = [...text.matchAll(headingRe)];

  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1].toLowerCase().replace(/\s*\(.*\)/, '').trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections[name] = text.slice(start, end).trim();
  }

  const explanation = sections['approach'] || '';

  let code = '';
  if (sections['code']) {
    const fenced = sections['code'].match(/```[a-zA-Z]*\n?([\s\S]*?)```/);
    code = fenced ? fenced[1].trim() : sections['code'].trim();
  }

  let time = '', space = '';
  if (sections['complexity']) {
    const timeMatch = sections['complexity'].match(/time[^\n:]*:?\s*(O\([^)]*\)|[^\n]+)/i);
    const spaceMatch = sections['complexity'].match(/space[^\n:]*:?\s*(O\([^)]*\)|[^\n]+)/i);
    if (timeMatch) time = timeMatch[1].trim();
    if (spaceMatch) space = spaceMatch[1].trim();
  }

  const notes = sections['key point'] || sections['key points'] || '';
  const hasAnything = explanation || code || time || space;

  return {
    problemStatement: '',
    approaches: hasAnything
      ? [{ title: 'Approach 1', intuition: '', explanation, code, timeComplexity: time, spaceComplexity: space }]
      : [],
    notes
  };
};
