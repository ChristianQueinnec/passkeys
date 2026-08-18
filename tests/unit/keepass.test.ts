import { describe, expect, it } from "vitest";
import { exportToKeepassCSV } from "../../src/lib/keepass";

describe("KeePass CSV export", () => {
    it("writes the inverse converter format with escaped fields and ISO dates", () => {
        const csv = exportToKeepassCSV([
            { id: "1", title: 'A "quoted", entry', username: "user", password: "secret", site: "https://example.test", notes: "line one\nline two", group: "Work/Email", tags: [], created: 0, modified: 1705316600 },
            { id: "2", title: "Untagged folder", tags: ["Personal", "Archive"] },
        ]);
        expect(csv).toBe(
            '"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"\n' +
            '"keepass/Work/Email","A ""quoted"", entry","user","secret","https://example.test","line one\nline two","","","2024-01-15T11:03:20.000Z",""\n' +
            '"keepass/Personal/Archive","Untagged folder","","","","","","","",""\n',
        );
    });
});
