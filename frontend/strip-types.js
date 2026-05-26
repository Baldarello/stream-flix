#!/usr/bin/env node

// Script to strip TypeScript syntax and rename .ts/.tsx to .js/.jsx
const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove import type statements
    content = content.replace(/import\s+type\s+{[^}]+}\s+from\s+['"][^'"]+['"];?\n?/g, '');
    content = content.replace(/import\s+type\s+\w+\s+from\s+['"][^'"]+['"];?\n?/g, '');
    content = content.replace(/,\s+type\s+\w+\s*,/g, ',');
    content = content.replace(/,\s+type\s+{[^}]+}\s+,/g, ',');
    
    // Remove @observable and @computed decorators
    content = content.replace(/@observable\s+/g, '');
    content = content.replace(/@computed\s+/g, '');
    
    // Remove export type declarations
    content = content.replace(/^export\s+type\s+\w+\s*=\s*[^;]+;$/gm, '');
    
    // Remove type declarations (inline and multi-line)
    content = content.replace(/^type\s+\w+\s*=\s*\{[\s\S]*?\};?\n?/gm, '');
    content = content.replace(/^type\s+\w+\s*=\s*'[^']*';?$/gm, '');
    
    // Remove private and readonly keywords
    content = content.replace(/private\s+/g, '');
    content = content.replace(/readonly\s+/g, '');
    
    // Remove type annotations: variable : Type = 
    content = content.replace(/:\s*(string|number|boolean|any|void|null|undefined|never|unknown)\s*(\[\])?\s*(\?|:\?)?(\s*\|\s*(null|undefined))?(\s*=)/g, ' =');
    content = content.replace(/:\s*(string|number|boolean|any|void|null|undefined|never|unknown)\s*(\[\])?\s*(\?|:\?)?(\s*\|\s*(null|undefined))?(\s*;)/g, ';');
    content = content.replace(/:\s*(string|number|boolean|any|void|null|undefined|never|unknown)\s*(\[\])?\s*(\?|:\?)?(\s*\|\s*(null|undefined))?(\s*,)/g, ',');
    content = content.replace(/:\s*(string|number|boolean|any|void|null|undefined|never|unknown)\s*(\[\])?\s*(\?|:\?)?(\s*\|\s*(null|undefined))?(\s*\))/g, ')');
    
    // Remove complex type annotations in variables
    content = content.replace(/:\s*MediaItem\s*(\[\])?\s*=/g, ' =');
    content = content.replace(/:\s*PlayableItem\s*(\[\])?\s*=/g, ' =');
    content = content.replace(/:\s*Episode\s*(\[\])?\s*=/g, ' =');
    content = content.replace(/:\s*MediaLink\s*(\[\])?\s*=/g, ' =');
    content = content.replace(/:\s*EpisodeProgress\s*(\[\])?\s*=/g, ' =');
    content = content.replace(/:\s*Revision\s*(\[\])?\s*=/g, ' =');
    content = content.replace(/:\s*ViewingHistoryItem\s*(\[\])?\s*=/g, ' =');
    content = content.replace(/:\s*AlertColor\s*=/g, ' =');
    content = content.replace(/:\s*InvalidLinkInfo\s*=/g, ' =');
    content = content.replace(/:\s*ActiveView\s*=/g, ' =');
    content = content.replace(/:\s*ThemeName\s*=/g, ' =');
    content = content.replace(/:\s*Language\s*=/g, ' =');
    
    // Remove type annotations in parameters
    content = content.replace(/,\s+(\w+)\s*:\s*MediaItem\s*(\[\])?\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*PlayableItem\s*(\[\])?\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*Episode\s*(\[\])?\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*string\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*number\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*boolean\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*any\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*(?:string\|null)\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*(?:number\|null)\s*(=)/g, ', $1$3');
    content = content.replace(/,\s+(\w+)\s*:\s*(?:number\|false)\s*(=)/g, ', $1$3');
    
    // Remove leading parameter type annotation
    content = content.replace(/\(\s*(\w+)\s*:\s*MediaItem\s*(\[\])?\s*,/g, '($1,');
    content = content.replace(/\(\s*(\w+)\s*:\s*PlayableItem\s*(\[\])?\s*,/g, '($1,');
    content = content.replace(/\(\s*(\w+)\s*:\s*Episode\s*(\[\])?\s*,/g, '($1,');
    content = content.replace(/\(\s*(\w+)\s*:\s*string\s*,/g, '($1,');
    content = content.replace(/\(\s*(\w+)\s*:\s*number\s*,/g, '($1,');
    content = content.replace(/\(\s*(\w+)\s*:\s*boolean\s*,/g, '($1,');
    content = content.replace(/\(\s*(\w+)\s*:\s*any\s*,/g, '($1,');
    
    // Remove return type annotations
    content = content.replace(/\)\s*:\s*Promise<[^>]+>\s*=>/g, ') =>');
    content = content.replace(/\)\s*:\s*\w+\s*=>/g, ') =>');
    content = content.replace(/\)\s*:\s*MediaItem\s*\|null\s*=>/g, ') =>');
    content = content.replace(/\)\s*:\s*Episode\s*\|null\s*=>/g, ') =>');
    content = content.replace(/\)\s*:\s*void\s*=>/g, ') =>');
    content = content.replace(/\)\s*:\s*boolean\s*=>/g, ') =>');
    content = content.replace(/\)\s*:\s*string\s*=>/g, ') =>');
    content = content.replace(/\)\s*:\s*number\s*=>/g, ') =>');
    
    // Remove 'as Type' casts
    content = content.replace(/\s+as\s+any\b/g, '');
    content = content.replace(/\s+as\s+MediaItem\b/g, '');
    content = content.replace(/\s+as\s+PlayableItem\b/g, '');
    content = content.replace(/\s+as\s+Episode\b/g, '');
    content = content.replace(/\s+as\s+MediaLink\b/g, '');
    content = content.replace(/\s+as\s+Error\b/g, '');
    content = content.replace(/\s+as\s+Dexie\b/g, '');
    content = content.replace(/\s+as\s+\w+\[\]/g, '');
    
    // Remove non-null assertions
    content = content.replace(/(\w+)!/g, '$1');
    
    // Remove generic type parameters in new expressions
    content = content.replace(/new\s+Set<\s*number\s*>/g, 'new Set()');
    content = content.replace(/new\s+Map<\s*\w+\s*,\s*\w+\s*>/g, 'new Map()');
    
    // Remove generic type annotations in Map and Set declarations
    content = content.replace(/Map<\s*number\s*,\s*MediaItem\s*>/g, 'Map()');
    content = content.replace(/Map<\s*number\s*,\s*EpisodeProgress\s*>/g, 'Map()');
    content = content.replace(/Map<\s*number\s*,\s*string\s*>/g, 'Map()');
    content = content.replace(/Map<\s*number\s*,\s*number\s*>/g, 'Map()');
    content = content.replace(/Map<\s*number\s*,\s*MediaLink\[\]\s*>/g, 'Map()');
    content = content.replace(/Map<\s*number\s*,\s*\{\s*language\?:\s*string\s*;\s*type\?:\s*'sub'\s*\|\s*'dub'\s*\}\s*>/g, 'Map()');
    content = content.replace(/Map<\s*number\s*,\s*\w+\s*>/g, 'Map()');
    content = content.replace(/Set<\s*number\s*>/g, 'Set()');
    
    // Remove array type annotations
    content = content.replace(/:\s*\w+\[\]\s*(=|;|,|\))/g, ': $1');
    
    // Remove Omit, Partial, Required, Pick, Record
    content = content.replace(/Omit<[^>]+>/g, '');
    content = content.replace(/Partial<[^>]+>/g, '');
    content = content.replace(/Required<[^>]+>/g, '');
    content = content.replace(/Pick<[^>]+>/g, '');
    content = content.replace(/Record<[^>]+>/g, '');
    
    // Remove complex object type annotations
    content = content.replace(/:\s*\{\s*language\?:\s*string\s*;\s*type\?:\s*'sub'\s*\|\s*'dub'\s*\}\s*(=|;)/g, ' =');
    
    // Remove (db as Dexie) - just use db
    content = content.replace /\(db as Dexie\)/g, 'db';
    
    // Update import paths - remove .ts and .tsx extensions
    content = content.replace(/from\s+['"](\.\.\/[^'"]+)\.ts['"]/g, 'from \'$1.js\'');
    content = content.replace(/from\s+['"](\.\.\/[^'"]+)\.tsx['"]/g, 'from \'$1.jsx\'');
    content = content.replace(/from\s+['"](\.\/[^'"]+)\.ts['"]/g, 'from \'$1.js\'');
    content = content.replace(/from\s+['"](\.\/[^'"]+)\.tsx['"]/g, 'from \'$1.jsx\'');
    
    // Also handle imports from ../types.ts specifically
    content = content.replace(/from\s+['"]\.\.\/types\.ts['"]/g, 'from \'../types.js\'');
    content = content.replace(/from\s+['"]\.\/types\.ts['"]/g, 'from \'./types.js\'');
    
    // Update imports from .ts files in same directory or subdirectories
    content = content.replace(/from\s+['"](\.\/[^'"]+)\.ts['"]/g, (match, p1) => {
        if (p1.endsWith('Service') || p1.endsWith('Store') || p1.endsWith('Utils') || p1.includes('/')) {
            return match;
        }
        return `from '${p1}.js'`;
    });
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    }
    return false;
}

function processDirectory(dirPath, extensions) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    let processed = 0;
    
    for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        
        if (file.isDirectory()) {
            if (file.name !== 'node_modules' && file.name !== 'dist' && file.name !== '.git') {
                processed += processDirectory(fullPath, extensions);
            }
        } else if (file.isFile()) {
            const ext = path.extname(file.name);
            if (extensions.includes(ext)) {
                if (processFile(fullPath)) {
                    processed++;
                }
            }
        }
    }
    
    return processed;
}

// Process all TypeScript and TSX files
const frontendDir = path.join(__dirname);
const processed = processDirectory(frontendDir, ['.ts', '.tsx']);
console.log(`Processed ${processed} TypeScript files`);
