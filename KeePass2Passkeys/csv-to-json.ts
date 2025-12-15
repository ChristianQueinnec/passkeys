import * as fs from 'fs';

export interface PasswordEntry {
  group: string;
  title: string;
  username: string;
  password: string;
  site: string;
  tags: string[];
  notes: string;
  created: number;
  modified: number;
}

/**
 * Parse a CSV line respecting quoted fields
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  fields.push(current);
  
  return fields;
}

/**
 * Process the Group field into tags
 * - Ignore lines containing "keepass/Archive/"
 * - Remove "keepass" prefix
 * - Split by slashes
 * - Return individual tags
 */
export function processGroupToTags(group: string): string[] | null {
  // Ignore archived entries
  if (group.includes('keepass/Archive/')) {
    return null;
  }
  
  // Remove "keepass" prefix (case-insensitive)
  let processed = group.replace(/^keepass\/?/i, '');
  
  // Split by slashes and filter out empty strings
  const tags = processed.split('/').filter(tag => tag.trim() !== '');
  
  return tags;
}

/**
 * Parse date string to Unix timestamp (seconds)
 */
export function parseDate(dateStr: string): number {
  if (!dateStr || dateStr.trim() === '') {
    return 0;
  }
  
  const date = new Date(dateStr);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert a CSV row to a PasswordEntry object
 */
export function convertRow(fields: string[]): PasswordEntry | null {
  if (fields.length < 10) {
    return null;
  }
  
  const [group, title, username, password, url, notes, totp, icon, lastModified, created] = fields;
  
  // Process tags from group
  const tags = processGroupToTags(group);
  
  // Skip archived entries
  if (tags === null) {
    return null;
  }
  
  return {
    group: group,
    title: title,
    username: username,
    password: password,
    site: url,
    tags: tags,
    notes: notes,
    created: parseDate(created),
    modified: parseDate(lastModified)
  };
}

/**
 * Convert CSV file to JSON array
 */
export function convertCSVToJSON(csvContent: string): PasswordEntry[] {
  const lines = csvContent.split('\n');
  const entries: PasswordEntry[] = [];
  
  // Skip header (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (line === '') {
      continue;
    }
    
    const fields = parseCSVLine(line);
    const entry = convertRow(fields);
    
    if (entry !== null) {
      entries.push(entry);
    }
  }
  
  return entries;
}

/**
 * Main function to read CSV file and write JSON output
 */
export function convertFile(inputPath: string, outputPath: string): void {
  const csvContent = fs.readFileSync(inputPath, 'utf-8');
  const entries = convertCSVToJSON(csvContent);
  const jsonOutput = JSON.stringify(entries, null, 2);
  
  fs.writeFileSync(outputPath, jsonOutput, 'utf-8');
  console.log(`Converted ${entries.length} entries from ${inputPath} to ${outputPath}`);
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: ts-node csv-to-json.ts <input.csv> <output.json>');
    process.exit(1);
  }
  
  const inputPath = args[0];
  const outputPath = args[1];
  
  try {
    convertFile(inputPath, outputPath);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
