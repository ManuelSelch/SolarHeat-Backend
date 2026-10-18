import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '..');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

describe('build entry configuration', () => {
    it('points Nest to the directory containing main.ts', () => {
        const config = readJson('nest-cli.json');
        expect(config.sourceRoot).toBe('src');
        expect(fs.existsSync(path.join(root, config.sourceRoot, 'main.ts'))).toBe(true);
    });

    it('pins production output to dist/main.js regardless of test source files', () => {
        const config = readJson('tsconfig.build.json');
        expect(config.compilerOptions.rootDir).toBe('./src');
        expect(config.include).toEqual(['src/**/*.ts']);
        expect(config.compilerOptions.incremental).toBe(false);
    });
});
