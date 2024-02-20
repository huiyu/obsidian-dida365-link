import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ToggleComponent } from 'obsidian';
import { DidaClient, DidaSession } from './dida365'
import EditorContext from './editor-context'

interface Dida365LinkPluginSettings {
	username: string;
	password: string;
	token: string;
	enableInputPrompt: boolean;
	defaultProjectForTasks: string;
	enableDidaLink: boolean;
	enableFrontMatterToDidaProjectLink: boolean;
	enableSelectionToDidaTaskLink: boolean;
	enableLineToDidaTaskLink: boolean;
	enableFrontMatterToDidaTaskLink: boolean;
}

const DEFAULT_SETTINGS: Dida365LinkPluginSettings = {
	username: 'username',
	password: 'password',
	token: '',
	enableInputPrompt: false,
	defaultProjectForTasks: "Inbox",
	enableDidaLink: false,
	enableFrontMatterToDidaProjectLink: false,
	enableSelectionToDidaTaskLink: false,
	enableLineToDidaTaskLink: false,
	enableFrontMatterToDidaTaskLink: false,
}

export default class Dida365LinkPlugin extends Plugin {
	settings: Dida365LinkPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "dida365-create-project",
			name: "Create project",
			editorCallback: async (editor: Editor, _) => {
				const ctx = new EditorContext(editor)
				const client = await DidaClient.of(new PluginDidaSession(this))

				const title = ctx.getCurrentFile().basename
				const project = await client.createProject({
					title: title
				})

				if (this.settings.enableDidaLink && this.settings.enableFrontMatterToDidaProjectLink) {
					await ctx.addFrontmatterProperty("dida-project", project.link)
				}

				new Notice(`Project "${title}" created`)
			}
		});

		this.addCommand({
			id: "dida365-create-task",
			name: "Create task",
			editorCallback: async (editor: Editor, _) => {

				const ctx = new EditorContext(editor)
				const client = await DidaClient.of(new PluginDidaSession(this))

				const file = ctx.getCurrentFile()
				const line = ctx.getCurrentLine().stripPrefixSymbols()
				const selection = ctx.getSelection()

				console.log(selection, line, file)

				const title = (() => {
					if (!selection.isEmpty()) {
						return selection.text
					} else if (!line.isEmpty()) {
						return line.text
					} else {
						return file.basename
					}

				})()

				const url = this.app.getObsidianUrl(file)


				const task = await client.createTask({
					title: `[${title}](${url})`,
					tags: ["obsidian"],
				})

				if (this.settings.enableDidaLink) {
					if (this.settings.enableSelectionToDidaTaskLink && !selection.isEmpty()) {
						selection.addLink(task.link)
					} else if (this.settings.enableLineToDidaTaskLink && !line.isEmpty()) {
						line.addLink(task.link)
					} else if (this.settings.enableFrontMatterToDidaTaskLink) {
						ctx.addFrontmatterProperty("dida-task", task.link)
					} else {
						const text = `[dida-task](${task.link})`
						ctx.insertTextAtCursor(text)
					}
				}

				new Notice(`Task "${title}" created`)
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


		this.addCommand({
			id: "dida365-copy-file-url",
			name: "Copy file URL",
			editorCallback: (editor: Editor, _) => {
				const ctx = new EditorContext(editor)
				const file = ctx.getCurrentFile()
				const url = this.app.getObsidianUrl(file)

				this.app.clipboard.writeText(url)
				new Notice("URL copied to clipboard")
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
			.setName('Default project for tasks')
			.setDesc('The default project to create tasks in.')
			.addText(text => text
				.setValue(this.plugin.settings.defaultProjectForTasks)
				.onChange(async (value) => {
					this.plugin.settings.defaultProjectForTasks = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Enable Dida365 link')
			.setDesc('If enabled, the plugin will attempt to create a link to Dida365 depends on the settings specified below.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDidaLink)
				.onChange(async (value) => {
					this.plugin.settings.enableDidaLink = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Add Dida365 project link to frontmatter")
			.setDesc("If enabled, the plugin will add a link to the Dida365 project in the frontmatter of the note.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFrontMatterToDidaProjectLink)
				.onChange(async (value) => {
					this.plugin.settings.enableFrontMatterToDidaProjectLink = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable selection to Dida365 task link')
			.setDesc('If enabled, the plugin will trasform current selection to a link to Dida365 task.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSelectionToDidaTaskLink)
				.onChange(async (value) => {
					this.plugin.settings.enableSelectionToDidaTaskLink = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable transform line to Dida365 link')
			.setDesc('If enabled, the plugin transforms the complete line to a link to Dida365 task.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableLineToDidaTaskLink)
				.onChange(async (value) => {
					this.plugin.settings.enableLineToDidaTaskLink = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Add Dida365 task link to frontmatter")
			.setDesc("If enabled, the plugin will add a link to the Dida365 task in the frontmatter of the note.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFrontMatterToDidaTaskLink)
				.onChange(async (value) => {
					this.plugin.settings.enableFrontMatterToDidaTaskLink = value;
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

