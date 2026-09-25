import jsPDF from 'jspdf';

const PAGE_HEIGHT = 297; // A4, mm
const BOTTOM_MARGIN = 20;

// Ensures there's room for at least one more line before writing; adds a
// new page and resets y if not. Call this before any doc.text() call so
// nothing runs off the bottom of the page silently.
function ensureSpace(doc, y, needed = 10) {
  if (y + needed > PAGE_HEIGHT - BOTTOM_MARGIN) {
    doc.addPage();
    return 20;
  }
  return y;
}

// Writes wrapped text line-by-line, adding new pages as needed MID-BLOCK —
// not just once before the block starts. A single long approach/code
// section can be many lines taller than one page; checking only at the
// top of the block (the old behavior) still let it run off the bottom.
function writeWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

// Soft greyish-dark (#1e293b) code block, not pitch black — reads like
// printed notes instead of a harsh black slab. Draws the filled/bordered
// card first, then the light-on-dark code text on top, splitting across
// pages if the block runs long (each new page gets its own card so the
// background never gets separated from its text).
function writeCodeBlock(doc, code, x, y, maxWidth, lineHeight = 5) {
  const CARD_BG = [30, 41, 59];      // #1e293b
  const CARD_BORDER = [63, 63, 70];  // #3f3f46
  const CODE_TEXT = [226, 232, 240]; // light grey-blue, readable on dark bg
  const padding = 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  const innerWidth = maxWidth - padding * 2;
  const lines = doc.splitTextToSize(code, innerWidth);

  let i = 0;
  while (i < lines.length) {
    // How many lines fit on the rest of this page (leave room for bottom margin)
    const availableHeight = (PAGE_HEIGHT - BOTTOM_MARGIN) - y - padding * 2;
    let linesThisPage = Math.max(1, Math.floor(availableHeight / lineHeight));
    if (linesThisPage < 1 || y > PAGE_HEIGHT - BOTTOM_MARGIN - lineHeight - padding * 2) {
      doc.addPage();
      y = 20;
      continue;
    }
    const chunk = lines.slice(i, i + linesThisPage);
    const blockHeight = chunk.length * lineHeight + padding * 2;

    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...CARD_BORDER);
    doc.roundedRect(x, y, maxWidth, blockHeight, 2, 2, 'FD');

    doc.setTextColor(...CODE_TEXT);
    let ty = y + padding + lineHeight * 0.7;
    for (const line of chunk) {
      doc.text(line, x + padding, ty);
      ty += lineHeight;
    }

    y += blockHeight;
    i += chunk.length;
    if (i < lines.length) {
      y += 4; // small gap before the next page's continuation card
    }
  }

  doc.setFont('helvetica', 'normal');
  return y;
}

export const generateQuestionPDF = async (question) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(14, 165, 233);
  y = ensureSpace(doc, y, 12);
  doc.text(question.title, margin, y);
  y += 15;

  // Meta info
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  y = ensureSpace(doc, y, 10);
  doc.text(`Difficulty: ${question.difficulty} | Platform: ${question.platform}`, margin, y);
  y += 20;

  // Approach
  if (question.approach) {
    y = ensureSpace(doc, y, 16);
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text('Approach', margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    y = writeWrappedText(doc, question.approach, margin, y, pageWidth - 2 * margin, 6);
    y += 15;
  }

  // Code
  if (question.code) {
    y = ensureSpace(doc, y, 16);
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text('Code', margin, y);
    y += 10;

    y = writeCodeBlock(doc, question.code, margin, y, pageWidth - 2 * margin);
    y += 15;
  }

  // Notes / Key Points
  if (question.notes) {
    y = ensureSpace(doc, y, 16);
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text('Notes', margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    y = writeWrappedText(doc, question.notes, margin, y, pageWidth - 2 * margin, 6);
    y += 15;
  }

  // Complexity
  if (question.complexity?.time || question.complexity?.space) {
    y = ensureSpace(doc, y, 16);
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text('Complexity', margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    if (question.complexity.time) {
      y = ensureSpace(doc, y, 8);
      doc.text(`Time: ${question.complexity.time}`, margin, y);
      y += 8;
    }
    if (question.complexity.space) {
      y = ensureSpace(doc, y, 8);
      doc.text(`Space: ${question.complexity.space}`, margin, y);
      y += 8;
    }
  }

  doc.save(`${question.title.replace(/\s+/g, '_')}.pdf`);
};

export const generateTopicPDF = async (topic, questions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(14, 165, 233);
  doc.text(topic.name, margin, y);
  y += 15;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${questions.length} Questions`, margin, y);
  y += 25;

  // Questions
  for (const q of questions) {
    y = ensureSpace(doc, y, 14);

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(`${q.title} (${q.difficulty})`, margin, y);
    y += 10;

    if (q.approach) {
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const snippet = q.approach.length > 200 ? q.approach.substring(0, 200) + '...' : q.approach;
      y = writeWrappedText(doc, snippet, margin, y, pageWidth - 2 * margin, 5);
      y += 10;
    }

    y += 5;
  }

  doc.save(`${topic.name.replace(/\s+/g, '_')}_Topic.pdf`);
};

export const generateSubjectPDF = async (subject, topics, allQuestions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Cover
  doc.setFontSize(28);
  doc.setTextColor(14, 165, 233);
  doc.text(subject.name, margin, y);
  y += 20;

  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(`Master Cheat Sheet - ${allQuestions.length} Questions`, margin, y);
  y += 30;

  // Topics and questions
  for (const topic of topics) {
    y = ensureSpace(doc, y, 18);

    const topicQs = allQuestions.filter(q => q.topicId === topic._id);

    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(topic.name, margin, y);
    y += 12;

    for (const q of topicQs) {
      y = ensureSpace(doc, y, 10);

      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(`\u2022 ${q.title} - ${q.difficulty}`, margin + 5, y);
      y += 8;

      if (q.approach) {
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const snippet = q.approach.length > 150 ? q.approach.substring(0, 150) + '...' : q.approach;
        y = writeWrappedText(doc, snippet, margin + 10, y, pageWidth - 2 * margin - 10, 4);
        y += 5;
      }
    }

    y += 10;
  }

  doc.save(`${subject.name.replace(/\s+/g, '_')}_Master_Sheet.pdf`);
};
