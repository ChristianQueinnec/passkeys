# CSV to JSON Converter for KeePass

A TypeScript utility to convert KeePass CSV exports into a structured JSON format.

## Features

- Converts KeePass CSV export format to JSON
- Processes group hierarchies into tags
- Filters out archived entries
- Parses dates to Unix timestamps
- Handles CSV quoting and escaping properly
- Comprehensive test suite using Jasmine

## Installation

```bash
npm install
```

## Usage

### Command Line

```bash
npm run convert input.csv output.json
```

Or directly with ts-node:

```bash
ts-node csv-to-json.ts input.csv output.json
```

### Programmatic Usage

```typescript
import { convertFile, convertCSVToJSON } from './csv-to-json';

// Convert file
convertFile('input.csv', 'output.json');

// Or convert CSV string directly
const csvContent = `...`;
const entries = convertCSVToJSON(csvContent);
console.log(entries);
```

## CSV Format

The input CSV should have the following header:
```
"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"
```

## Output Format

Each entry is converted to:

```json
{
  "group": "keepass/Work/Email",
  "title": "Gmail Account",
  "username": "user@example.com",
  "password": "mypassword123",
  "site": "https://gmail.com",
  "tags": ["Work", "Email"],
  "notes": "Main email account",
  "created": 1685606400,
  "modified": 1705316600
}
```

## Tag Processing Rules

- Lines containing `keepass/Archive/` are ignored
- The `keepass` prefix is removed from groups
- Group paths are split by `/` into individual tags
- Example: `keepass/Work/Email` → `["Work", "Email"]`

## Running Tests

```bash
npm test
```

## Test Coverage

The test suite includes:
- CSV parsing (quoted fields, escaped quotes, commas)
- Group to tag conversion
- Date parsing
- Row conversion
- Full CSV to JSON conversion
- Edge cases and error handling

## License

MIT
