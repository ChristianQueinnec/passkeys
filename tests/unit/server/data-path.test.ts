import { describe, expect, it } from 'vitest';
import { resolveDataDir } from '../../../src/lib/server/data-path';

describe('resolveDataDir', () => {
    it('uses PASSKEYS_DATA_DIR and expands a leading tilde', () => {
        expect(resolveDataDir({ PASSKEYS_DATA_DIR: '~/.config/passkeys' }, '/project', '/home/tester'))
            .toBe('/home/tester/.config/passkeys');
    });

    it('keeps the development data directory as the default', () => {
        expect(resolveDataDir({}, '/project', '/home/tester')).toBe('/project/data');
    });
});
