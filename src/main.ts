import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { DidaClient, DidaSession } from './dida365'

interface Dida365LinkPluginSettings {
	username: string;
	password: string;
	token: string;
	enableInputPrompt: boolean;
	enableDida365Link: boolean;
	enableLineToDida365Link: boolean;
}

const DEFAULT_SETTINGS: Dida365LinkPluginSettings = {
	username: 'default',
	password: 'default',
	token: '',
	enableInputPrompt: false,
	enableDida365Link: false,
	enableLineToDida365Link: false,

}

export default class Dida365LinkPlugin extends Plugin {
	settings: Dida365LinkPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "dida365-create-project",
			name: "Create project",
			editorCallback: async (editor: Editor, _) => {
				const editorSupport = new EditorSupport(editor, this.app)
				const didaClient = await DidaClient.of(new PluginDidaSession(this))
				const title = editorSupport.getActiveFile().basename
				await didaClient.createProject({
					title: title,
				})

				new Notice(`Project "${title}" created`)
			}
		});

		this.addCommand({
			id: "dida365-create-task",
			name: "Create task",
			editorCallback: async (editor: Editor, _) => {
				const editorSupport = new EditorSupport(editor, this.app)
				const didaClient = await DidaClient.of(new PluginDidaSession(this))

				const name = editorSupport.resolveContextText()
				const link = editorSupport.getObsidianUrl()
				const title = `[${name}](${link})`

				await didaClient.createTask({
					title: title,
					tags: ["obsidian"],
				})

				new Notice(`Task "${name}" created`)
			}
		})

		this.addCommand({
			id: "dida365-link-project",
			name: "Link project",
			editorCallback: (editor: Editor, _) => {
				// TODO: 

				new Notice("Not implemented yet")
			}
		})


		this.addCommand({
			id: "dida365-link-task",
			name: "Link task",
			editorCallback: (editor: Editor, _) => {
				// TODO: 

				new Notice("Not implemented yet")
			}
		})

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new Dida365PluginSettingTab(this.app, this));
	}


	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class Dida365PluginSettingTab extends PluginSettingTab {
	plugin: Dida365LinkPlugin;

	constructor(app: App, plugin: Dida365LinkPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.containerEl.createEl('h2', { text: 'Authentication' })

		new Setting(containerEl)
			.setName('Username')
			.setDesc('Username')
			.addText(text => text
				.setPlaceholder('Email or Phone Number')
				.setValue(this.plugin.settings.username)
				.onChange(async (value) => {
					this.plugin.settings.username = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Password')
			.setDesc('Password')
			.addText(text => text
				.setPlaceholder('Enter your password')
				.setValue(this.plugin.settings.password)
				.onChange(async (value) => {
					this.plugin.settings.password = value;
					await this.plugin.saveSettings();
				}));

		this.containerEl.createEl('h2', { text: 'General' })

		new Setting(containerEl)
			.setName("Enable input prompt")
			.setDesc("If enabled, the plugin will prompt you for input when creating a task (depend on quickadd plugin).")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableInputPrompt)
				.onChange(async (value) => {
					this.plugin.settings.enableInputPrompt = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Dida365 link')
			.setDesc('If enabled, the plugin will transform the selected text to a link to Dida365 or insert a "todo" link of Dida365 at the cursor position if not text selected.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDida365Link)
				.onChange(async (value) => {
					this.plugin.settings.enableDida365Link = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable transform line to Dida365 link')
			.setDesc('If enabled, the plugin transforms the complete line to a link to Dida365.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableLineToDida365Link)
				.onChange(async (value) => {
					this.plugin.settings.enableLineToDida365Link = value;
					await this.plugin.saveSettings();
				}));

	}
}


class PluginDidaSession implements DidaSession {
	username: string;
	password: string;
	token: string;
	plugin: Dida365LinkPlugin;

	constructor(plugin: Dida365LinkPlugin) {
		this.username = plugin.settings.username
		this.password = plugin.settings.password
		this.token = plugin.settings.token
		this.plugin = plugin
	}

	async save() {
		this.plugin.settings.token = this.token
		this.plugin.settings.username = this.username
		this.plugin.settings.password = this.password
		await this.plugin.saveSettings()
	}
}


class EditorSupport {
	editor: Editor;
	app: App;

	constructor(editor: Editor, app: App) {
		this.editor = editor;
		this.app = app;
	}

	resolveContextText(): string {
		const activeFile = this.getActiveFile();
		const selection = this.editor.getSelection();
		const cursorLine = this.editor.getCursor().line;
		if (selection) {
			return this.editor.getSelection();
		} else if (cursorLine && this.editor.getLine(cursorLine).trim() != "") {
			return this.editor.getLine(cursorLine);
		} else {
			return activeFile.basename;
		}
	}

	getActiveFile() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			const errMsg = "Please select a file first";
			new Notice(errMsg);
			throw new Error(errMsg);
		}
		return activeFile;

	}

	getSelection() {
		return this.editor.getSelection();
	}

	getCursorLine() {
		return this.editor.getCursor().line;
	}

	getLine(line: number) {
		return this.editor.getLine(line);
	}

	getObsidianUrl(): string {
		const activeFile = this.getActiveFile();
		return this.app.getObsidianUrl(activeFile)
	}
}

