export interface ProcessedTranscript {
  rawTranscript: string;
  plainNoteHtml: string;
  annotatedNoteHtml: string;
  extractedDates: string[];
  extractedNames: string[];
  extractedKeyPoints: string[];
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const COMMON_STOPWORDS = new Set([
  'The',
  'A',
  'An',
  'This',
  'That',
  'These',
  'Those',
  'My',
  'Your',
  'His',
  'Her',
  'Our',
  'Their',
  'Action',
  'Project',
  'Process',
  'System',
  'Item',
  'Note',
  'Meeting',
  'Recording',
  'Audio',
  'Plan',
  'Task',
  'Goal',
  'Result',
  'Issue',
  'Problem',
  'Work',
  'Today',
  'Tomorrow',
  'Yesterday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);

export function processTranscript(rawText: string): ProcessedTranscript {
  const cleanedText = rawText.trim();
  if (!cleanedText) {
    const emptyHtml = '<h1>Audio note</h1><p><em>No transcript recorded.</em></p>';
    return {
      rawTranscript: '',
      plainNoteHtml: emptyHtml,
      annotatedNoteHtml: emptyHtml,
      extractedDates: [],
      extractedNames: [],
      extractedKeyPoints: [],
    };
  }

  const extractedDates: string[] = [];
  const extractedNames: string[] = [];
  const extractedKeyPoints: string[] = [];

  // 1. Date & Time regex
  const datePattern =
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?\b|\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b|\b(?:today|tomorrow|yesterday|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|next\s+(?:week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = datePattern.exec(cleanedText)) !== null) {
    const val = match[0].trim();
    if (val && !extractedDates.includes(val)) {
      extractedDates.push(val);
    }
  }

  // 2. Name / People regex - Must be Capitalized & not a common stopword
  const honorificPattern = /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Professor)\s+([A-Z][a-z]+)\b/g;
  while ((match = honorificPattern.exec(cleanedText)) !== null) {
    if (match[1] && !COMMON_STOPWORDS.has(match[1])) {
      const val = match[0].trim();
      if (!extractedNames.includes(val)) {
        extractedNames.push(val);
      }
    }
  }

  const cueNamePattern =
    /\b(?:assigned to|meeting with|spoke to|talked with|call with|email|contact|delegate to)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/gi;
  while ((match = cueNamePattern.exec(cleanedText)) !== null) {
    if (match[1]) {
      const name = match[1].trim();
      const firstWord = name.split(' ')[0];
      if (name && !COMMON_STOPWORDS.has(firstWord) && !extractedNames.includes(name)) {
        extractedNames.push(name);
      }
    }
  }

  // 3. Important Points & Action Items
  const keyPointPattern =
    /[^.!?\n]*\b(?:need to|must|should|have to|make sure to|remember to|don't forget to|important|action item|todo|key takeaway|decision|we decided|agreed to|the goal|next step|deadline)\b[^.!?\n]*[.!?\n]?/gi;
  while ((match = keyPointPattern.exec(cleanedText)) !== null) {
    const point = match[0].trim();
    if (point.length > 8 && !extractedKeyPoints.includes(point)) {
      extractedKeyPoints.push(point);
    }
  }

  // Raw Paragraphs (Plain Version - exact raw text)
  const rawParagraphs = cleanedText.split('\n').filter((p) => p.trim().length > 0);
  const plainParagraphsHtml = rawParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const plainNoteHtml = `<h1>Audio note</h1><h2>Transcript</h2>${plainParagraphsHtml}`;

  // Annotated Paragraphs (Same raw text, but with color highlights on exact matching words)
  const annotatedParagraphsHtml = rawParagraphs
    .map((p) => {
      let escaped = escapeHtml(p);

      extractedKeyPoints.forEach((kp) => {
        const escKp = escapeHtml(kp);
        if (escaped.includes(escKp)) {
          escaped = escaped.replace(escKp, `<mark class="hl-key">${escKp}</mark>`);
        }
      });

      extractedDates.forEach((dateStr) => {
        const escDate = escapeHtml(dateStr);
        const regex = new RegExp(`\\b${escDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        escaped = escaped.replace(regex, `<mark class="hl-date">${escDate}</mark>`);
      });

      extractedNames.forEach((nameStr) => {
        const escName = escapeHtml(nameStr);
        const regex = new RegExp(`\\b${escName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        escaped = escaped.replace(regex, `<mark class="hl-name">${escName}</mark>`);
      });

      return `<p>${escaped}</p>`;
    })
    .join('');

  const annotatedNoteHtml = `
<h1>Audio note</h1>
<h2>Annotated Transcript</h2>
${annotatedParagraphsHtml}`;

  return {
    rawTranscript: cleanedText,
    plainNoteHtml,
    annotatedNoteHtml,
    extractedDates,
    extractedNames,
    extractedKeyPoints,
  };
}
