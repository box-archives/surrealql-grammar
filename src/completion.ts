import * as vscode from "vscode";
import { keywords } from "./keyword.js";

const completionItems: vscode.CompletionItem[] = keywords.map((keyword) => {
    const item = new vscode.CompletionItem(
        keyword,
        vscode.CompletionItemKind.Keyword
    );
    item.insertText = keyword;
    return item;
});

export const completionProvider = vscode.languages.registerCompletionItemProvider(
    "surrealql",
    {
        provideCompletionItems(
            _document: vscode.TextDocument,
            _position: vscode.Position,
            _token: vscode.CancellationToken,
            _context: vscode.CompletionContext
        ): vscode.CompletionItem[] {
            return completionItems;
        },
    }
);
