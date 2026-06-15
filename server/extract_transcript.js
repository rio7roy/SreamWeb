const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\maria\\.gemini\\antigravity-ide\\brain\\65b68aff-a16c-4113-8fd5-354b53689fef\\.system_generated\\logs\\transcript.jsonl';

async function extract() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: fileStream });

  let fullContent = '';
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT' && obj.content && obj.content.includes('where are all the contents?')) {
        fullContent = obj.content;
      }
    } catch (e) {}
  }

  if (fullContent) {
    // Find the JSON array
    const startIndex = fullContent.indexOf('[');
    if (startIndex !== -1) {
      // It might be truncated, so we find the last '},' or '}'
      let jsonStr = fullContent.substring(startIndex);
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace !== -1) {
        jsonStr = jsonStr.substring(0, lastBrace + 1) + ']';
        try {
          const parsed = JSON.parse(jsonStr);
          fs.writeFileSync('d:\\SreamWeb\\server\\data\\parsed_items.json', JSON.stringify(parsed, null, 2));
          console.log(`Saved ${parsed.length} items to parsed_items.json`);
        } catch(e) {
          console.log('Failed to parse JSON, saving raw', e.message);
          fs.writeFileSync('d:\\SreamWeb\\server\\data\\raw_json.txt', jsonStr);
        }
      }
    }
  } else {
    console.log('User message not found');
  }
}

extract();
