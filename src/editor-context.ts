import { App, Editor, EditorPosition, Notice, TFile } from 'obsidian';
import * as util from './util';

class EditorText {

	file: TFile;
	text: string;
	position: EditorPosition;
	editor: Editor;

	constructor(file: TFile, text: string, position: EditorPosition, editor: Editor) {
		this.file = file;
		this.text = text;
		this.position = position;
		this.editor = editor;
	}

	stripPrefixSymbols(): EditorText {
		// TODO:
		return this;
	}

	isEmpty(): boolean {
		return util.isBlankString(this.text);
	}

	containsLink(): boolean {
		return this.containsInternalLink() || this.containsExternalLink();
	}

	containsExternalLink(): boolean {
		return /\[[^\]]*\]\([^\)]+\)/.test(this.text)
	}

	containsInternalLink(): boolean {
		return /\[\[([^\]]+)\]\]/.test(this.text)
	}

	addLink(link: string): EditorText {
		const replaceText = `[${this.text}](${link})`;
		this.editor.replaceRange(
			replaceText,
			this.position,
			{ line: this.position.line, ch: this.position.ch + this.text.length });
		return new EditorText(this.file, replaceText, this.position, this.editor);
	}
}

class EditorContext {
	editor: Editor;
	app: App;

	constructor(editor: Editor) {
		this.editor = editor;
		this.app = editor.editorComponent.app;
	}

	public static of(Editor: Editor): EditorContext {
		return new EditorContext(Editor);
	}

	getCurrentFile(): TFile {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			const errMsg = "Please select a file first";
			new Notice(errMsg);
			throw new Error(errMsg);
		}
		return activeFile;
	}

	getSelection(): EditorText {
		const selection = this.editor.getSelection();
		return new EditorText(this.getCurrentFile(), selection, this.editor.getCursor("from"), this.editor);
	}

	getCurrentLine(): EditorText {
		const cursor = this.editor.getCursor();
		const line = this.editor.getLine(cursor.line);
		return new EditorText(this.getCurrentFile(), line, { line: cursor.line, ch: 0 }, this.editor);
	}

	insertTextAtCursor(text: string) {
		this.editor.replaceRange(text, this.editor.getCursor());
	}

	async addFrontmatterProperty(key: string, value: string) {
		if (!this.app.plugins.plugins["metaedit"]) {
			throw new Error("Please install the 'MetaEdit' plugin to use this feature")
		}

		const { createYamlProperty } = this.app.plugins.plugins["metaedit"].api;

		await createYamlProperty(key, value, this.getCurrentFile())
	}
}


export default EditorContext;
