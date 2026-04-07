import * as vscode from "vscode";
import { SurrealQL } from "@surrealdb/ql-wasm";
import { completionProvider } from "./completion.js";

let diagnosticCollection: vscode.DiagnosticCollection;

export async function activate(context: vscode.ExtensionContext) {
    try {
        SurrealQL.setup();
    } catch (e) {
        console.error("Failed to setup ql-wasm:", e);
    }

    diagnosticCollection = vscode.languages.createDiagnosticCollection("surrealql");
    context.subscriptions.push(diagnosticCollection);

    const validateDocument = (document: vscode.TextDocument) => {
        if (document.languageId !== "surrealql") {
            return;
        }

        const text = document.getText();
        const diagnostics = getSurqlDiagnostics(text, document);
        diagnosticCollection.set(document.uri, diagnostics);
    };

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(validateDocument),
        vscode.workspace.onDidChangeTextDocument((e) => validateDocument(e.document)),
        vscode.workspace.onDidSaveTextDocument(validateDocument)
    );

    for (const doc of vscode.workspace.textDocuments) {
        validateDocument(doc);
    }

    // removing comments, etc. is breaking, so we do not register as a formatter.

    const formatCommand = vscode.commands.registerCommand(
        "surrealql.formatDocument",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== "surrealql") {
                return;
            }

            const document = editor.document;
            const text = document.getText();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );

            try {
                const formatted = formatSurql(text);

                await editor.edit((editBuilder) => {
                    editBuilder.replace(fullRange, formatted);
                });
            } catch (error) {
                const message = error as string;
                void vscode.window.showErrorMessage(`Failed to format SurrealQL: ${message}`);
            }
        }
    );

    context.subscriptions.push(formatCommand);

    context.subscriptions.push(completionProvider); // TODO: add completion provider
}

function formatSurql(text: string): string {
    const config = vscode.workspace.getConfiguration("surrealql");
    const pretty = config.get<boolean>("format.pretty", true);
    return SurrealQL.format(text, pretty);
}

function validateSurql(surql: string) {
    try {
        SurrealQL.validate(surql);
        return undefined;
    } catch (error) {
        const message = error as string;

        const match = message.match(/^Parse error: (.+)?\s+-->\s+\[(\d+):(\d+)\]/i);

        if (!match) {
            return undefined;
        }

        const reason = match[1]!.trim();
        const lineNumber = Number(match[2]);
        const column = Number(match[3]);

        return {
            reason,
            lineNumber,
            column,
        }
    }
}

function getSurqlDiagnostics(
    surql: string,
    document: vscode.TextDocument,
): vscode.Diagnostic[] {
    const diagnostics = validateSurql(surql);
    if (diagnostics) {
        const line = diagnostics.lineNumber - 1;
        const startColumn = diagnostics.column - 1;

        let endColumn = startColumn + 1;
        const textLine = document.lineAt(line);
        const text = textLine.text;
        // from startColumn to endColumn
        for (let i = startColumn; i < text.length; i++) {
            if (/\s/.test(text[i]!)) {
                break;
            }
            endColumn = i + 1;
        }

        return [new vscode.Diagnostic(
            new vscode.Range(
                new vscode.Position(line, startColumn),
                new vscode.Position(line, endColumn)
            ),
            diagnostics.reason,
            vscode.DiagnosticSeverity.Error
        )];
    }
    return [];
}

export function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
}
