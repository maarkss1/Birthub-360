import { Project, SyntaxKind, DiagnosticCategory } from 'ts-morph';

console.log('Initializing ts-morph project...');
const project = new Project({
    tsConfigFilePath: './tsconfig.json',
    skipAddingFilesFromTsConfig: false,
});

const sourceFiles = project.getSourceFiles();
console.log(`Found ${sourceFiles.length} source files.`);

let fixedImports = 0;
let fixedCatch = 0;
let fixedReturns = 0;

for (const sourceFile of sourceFiles) {
    if (sourceFile.getFilePath().includes('node_modules')) continue;

    let modified = false;

    // 1. Fix missing .js extensions (TS2835)
    const importDecls = sourceFile.getImportDeclarations();
    for (const decl of importDecls) {
        const moduleSpecifier = decl.getModuleSpecifierValue();
        if (moduleSpecifier.startsWith('.') && 
            !moduleSpecifier.endsWith('.js') && 
            !moduleSpecifier.endsWith('.ts') && 
            !moduleSpecifier.endsWith('.tsx') &&
            !moduleSpecifier.endsWith('.json')) {
            decl.setModuleSpecifier(moduleSpecifier + '.js');
            modified = true;
            fixedImports++;
        }
    }

    const exportDecls = sourceFile.getExportDeclarations();
    for (const decl of exportDecls) {
        if (!decl.hasModuleSpecifier()) continue;
        const moduleSpecifier = decl.getModuleSpecifierValue();
        if (moduleSpecifier && moduleSpecifier.startsWith('.') && 
            !moduleSpecifier.endsWith('.js') && 
            !moduleSpecifier.endsWith('.ts') && 
            !moduleSpecifier.endsWith('.tsx') &&
            !moduleSpecifier.endsWith('.json')) {
            decl.setModuleSpecifier(moduleSpecifier + '.js');
            modified = true;
            fixedImports++;
        }
    }

    // 2. Fix 'err' is of type unknown (TS18046) -> Add : any to catch variables
    const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);
    for (const catchClause of catchClauses) {
        const varDecl = catchClause.getVariableDeclaration();
        if (varDecl && !varDecl.getTypeNode()) {
            varDecl.setType('any');
            modified = true;
            fixedCatch++;
        }
    }

    if (modified) {
        sourceFile.saveSync();
    }
}

console.log('Scanning for TS7030 diagnostics (Not all code paths return a value)...');
// Refresh diagnostics to catch remaining errors
const diagnostics = project.getPreEmitDiagnostics();
for (const diagnostic of diagnostics) {
    if (diagnostic.getCode() === 7030) { // TS7030
        const node = diagnostic.getNode();
        if (node) {
            const func = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) || 
                         node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) ||
                         node.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
            if (func) {
                const body = func.getBody();
                if (body && body.getKind() === SyntaxKind.Block) {
                    // Try to append 'return;' or fix 'res.json'
                    const statements = body.getStatements();
                    if (statements.length > 0) {
                        const lastStatement = statements[statements.length - 1];
                        if (lastStatement.getKind() === SyntaxKind.ExpressionStatement) {
                            const text = lastStatement.getText();
                            if (text.startsWith('res.json') || text.startsWith('res.status') || text.startsWith('res.send')) {
                                lastStatement.replaceWithText(`return ${text}`);
                                fixedReturns++;
                                const sf = node.getSourceFile();
                                sf.saveSync();
                            }
                        }
                    }
                }
            }
        }
    }
}

console.log(`Finished fixing:
- ${fixedImports} import/export relative paths
- ${fixedCatch} catch blocks with 'any'
- ${fixedReturns} implicit returns (TS7030)
`);
