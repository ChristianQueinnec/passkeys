import {
  parseCSVLine,
  processGroupToTags,
  parseDate,
  convertRow,
  convertCSVToJSON,
  PasswordEntry
} from '../csv-to-json';

describe('CSV to JSON Converter', () => {
  
  describe('parseCSVLine', () => {
    it('should parse simple CSV line', () => {
      const line = 'value1,value2,value3';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should parse CSV line with quoted fields', () => {
      const line = '"value1","value2","value3"';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle commas inside quoted fields', () => {
      const line = '"value1,with,commas","value2","value3"';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value1,with,commas', 'value2', 'value3']);
    });

    it('should handle escaped quotes', () => {
      const line = '"value ""with"" quotes","value2"';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value "with" quotes', 'value2']);
    });

    it('should handle empty fields', () => {
      const line = 'value1,,value3';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value1', '', 'value3']);
    });
  });

  describe('processGroupToTags', () => {
    it('should remove keepass prefix and split by slashes', () => {
      const group = 'keepass/Work/Email';
      const result = processGroupToTags(group);
      expect(result).toEqual(['Work', 'Email']);
    });

    it('should handle keepass without trailing slash', () => {
      const group = 'keepassWork/Email';
      const result = processGroupToTags(group);
      expect(result).toEqual(['Work', 'Email']);
    });

    it('should return null for archived entries', () => {
      const group = 'keepass/Archive/OldStuff';
      const result = processGroupToTags(group);
      expect(result).toBeNull();
    });

    it('should handle single tag', () => {
      const group = 'keepass/Personal';
      const result = processGroupToTags(group);
      expect(result).toEqual(['Personal']);
    });

    it('should handle multiple levels', () => {
      const group = 'keepass/Work/Servers/Production';
      const result = processGroupToTags(group);
      expect(result).toEqual(['Work', 'Servers', 'Production']);
    });

    it('should filter out empty tags', () => {
      const group = 'keepass/Work//Email';
      const result = processGroupToTags(group);
      expect(result).toEqual(['Work', 'Email']);
    });

    it('should be case-insensitive for keepass prefix', () => {
      const group = 'KeePass/Work/Email';
      const result = processGroupToTags(group);
      expect(result).toEqual(['Work', 'Email']);
    });
  });

  describe('parseDate', () => {
    it('should parse ISO date string', () => {
      const dateStr = '2024-01-15T10:30:00Z';
      const result = parseDate(dateStr);
      expect(result).toBe(1705316600);
    });

    it('should return 0 for empty string', () => {
      const result = parseDate('');
      expect(result).toBe(0);
    });

    it('should return 0 for whitespace', () => {
      const result = parseDate('   ');
      expect(result).toBe(0);
    });

    it('should parse common date formats', () => {
      const dateStr = '2024-12-15';
      const result = parseDate(dateStr);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('convertRow', () => {
    it('should convert valid CSV row to PasswordEntry', () => {
      const fields = [
        'keepass/Work/Email',
        'Gmail Account',
        'user@example.com',
        'mypassword123',
        'https://gmail.com',
        'Main email account',
        '',
        '',
        '2024-01-15T10:30:00Z',
        '2023-06-01T08:00:00Z'
      ];
      
      const result = convertRow(fields);
      
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Gmail Account');
      expect(result!.username).toBe('user@example.com');
      expect(result!.password).toBe('mypassword123');
      expect(result!.site).toBe('https://gmail.com');
      expect(result!.tags).toEqual(['Work', 'Email']);
      expect(result!.notes).toBe('Main email account');
      expect(result!.created).toBeGreaterThan(0);
      expect(result!.modified).toBeGreaterThan(0);
    });

    it('should return null for archived entries', () => {
      const fields = [
        'keepass/Archive/Old',
        'Old Account',
        'user@old.com',
        'oldpass',
        'https://old.com',
        'Archived',
        '',
        '',
        '2024-01-15T10:30:00Z',
        '2023-06-01T08:00:00Z'
      ];
      
      const result = convertRow(fields);
      expect(result).toBeNull();
    });

    it('should return null for invalid rows', () => {
      const fields = ['only', 'five', 'fields', 'here', 'oops'];
      const result = convertRow(fields);
      expect(result).toBeNull();
    });
  });

  describe('convertCSVToJSON', () => {
    it('should convert complete CSV to JSON array', () => {
      const csv = `"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"
"keepass/Work","Email Account","user@work.com","pass123","https://mail.com","Work email","","","2024-01-15T10:30:00Z","2023-06-01T08:00:00Z"
"keepass/Personal","Shopping","shopper@email.com","shop456","https://shop.com","My shopping account","","","2024-02-20T14:00:00Z","2023-08-10T12:00:00Z"`;
      
      const result = convertCSVToJSON(csv);
      
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Email Account');
      expect(result[0].tags).toEqual(['Work']);
      expect(result[1].title).toBe('Shopping');
      expect(result[1].tags).toEqual(['Personal']);
    });

    it('should skip archived entries', () => {
      const csv = `"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"
"keepass/Work","Active Account","user@work.com","pass123","https://work.com","Active","","","2024-01-15T10:30:00Z","2023-06-01T08:00:00Z"
"keepass/Archive/Old","Archived Account","old@work.com","oldpass","https://old.com","Archived","","","2024-02-20T14:00:00Z","2023-08-10T12:00:00Z"`;
      
      const result = convertCSVToJSON(csv);
      
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Active Account');
    });

    it('should skip empty lines', () => {
      const csv = `"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"
"keepass/Work","Account1","user1@work.com","pass1","https://site1.com","Note1","","","2024-01-15T10:30:00Z","2023-06-01T08:00:00Z"

"keepass/Work","Account2","user2@work.com","pass2","https://site2.com","Note2","","","2024-02-20T14:00:00Z","2023-08-10T12:00:00Z"`;
      
      const result = convertCSVToJSON(csv);
      
      expect(result.length).toBe(2);
    });

    it('should handle complex group hierarchies', () => {
      const csv = `"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"
"keepass/Work/Servers/Production","Server1","admin","adminpass","https://server1.com","Production server","","","2024-01-15T10:30:00Z","2023-06-01T08:00:00Z"`;
      
      const result = convertCSVToJSON(csv);
      
      expect(result.length).toBe(1);
      expect(result[0].tags).toEqual(['Work', 'Servers', 'Production']);
    });
  });
});
