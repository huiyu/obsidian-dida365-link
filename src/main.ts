import { App, ButtonComponent, Editor, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { DidaClient, DidaSession } from './dida365'
import { EditorContext, EditorText } from './editor-support'
import { queryPromot, inputPrompt } from './prompt'
import { includeIgnoreCase } from './util'

interface Dida365LinkPluginSettings {
	username: string;
	password: string;
	token: string;
	enableInputPrompt: boolean;
	enableDidaTaskLink: boolean;
	enableSelectionToDidaTaskLink: boolean;
	enableLineToDidaTaskLink: boolean;
	enableFrontMatterToDidaTaskLink: boolean;
	enableFrontMatterToDidaProjectLink: boolean;
}

const DEFAULT_SETTINGS: Dida365LinkPluginSettings = {
	username: 'username',
	password: 'password',
	token: '',
	enableInputPrompt: false,
	enableDidaTaskLink: false,
	enableSelectionToDidaTaskLink: false,
	enableLineToDidaTaskLink: false,
	enableFrontMatterToDidaTaskLink: false,
	enableFrontMatterToDidaProjectLink: false,
}

export default class Dida365LinkPlugin extends Plugin {
	settings: Dida365LinkPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "dida365-create-project",
			name: "Create project",
			editorCallback: async (editor: Editor, _) => {
				const ctx = EditorContext.of(editor)
				const client = await DidaClient.of(new PluginDidaSession(this))

				const filename = ctx.getFile().basename
				const title = this.settings.enableInputPrompt ? await inputPrompt(this.app, "Project Title", filename) : filename
				const project = await client.createProject({ title: title })

				if (this.settings.enableDidaTaskLink) {
					await this.createProjectLink(project.link, ctx)
				}

				new Notice(`Project "${project.title}" created`)
			}
		});

		this.addCommand({
			id: "dida365-create-task",
			name: "Create task",
			editorCallback: async (editor: Editor, _) => {

				const ctx = EditorContext.of(editor)
				const client = await DidaClient.of(new PluginDidaSession(this))

				const file = ctx.getFile()
				const line = ctx.getCurrentLine().stripPrefixSymbols()
				const selection = ctx.getSelection()

				const enableInputPrompt = this.settings.enableInputPrompt

				// resolve title
				const title = await (async () => {
					var t = file.basename
					if (!selection.isEmpty()) {
						t = selection.text
					} else if (!line.isEmpty()) {
						t = line.text
					}

					if (enableInputPrompt) {
						return await inputPrompt(this.app, "Task Title", t)
					} else {
						return t
					}
				})()

				const task = await client.createTask({
					title: title,
					content: `[Obsidian](${file.url})`,
					tags: ["Obsidian"],
				})

				if (this.settings.enableDidaTaskLink) {
					await this.createTaskLink(task.link, selection, line, ctx);
				}

				new Notice(`Task "${task.title}" created`)
			}
		})

		this.addCommand({
			id: "dida365-link-project",
			name: "Link project",
			editorCallback: async (editor: Editor, _) => {
				const ctx = EditorContext.of(editor)
				const client = await DidaClient.of(new PluginDidaSession(this))

				const projects = await client.listProjects()
				const project = await queryPromot(this.app, async (query) => { return projects.filter(p => includeIgnoreCase(p.title, query)) })

				if (this.settings.enableDidaTaskLink) {
					await this.createProjectLink(project.link, ctx)
				}

				new Notice(`Project "${project.title}" linked`)
			}
		})


		this.addCommand({
			id: "dida365-link-task",
			name: "Link task",
			editorCallback: async (editor: Editor, _) => {
				const ctx = EditorContext.of(editor)
				const client = await DidaClient.of(new PluginDidaSession(this))

				const tasks = await client.listTasks();
				const task = await queryPromot(this.app, async (query) => { return tasks.filter((t) => includeIgnoreCase(t.title, query)) })

				// update tags
				if (task.tags === undefined) {
					task.tags = ["Obsidian"]
				} else if (task.tags.includes("Obsidian") === false) {
					task.tags.push("Obsidian")
				}

				// append link to the task content
				const url = ctx.getFile().url
				task.content = `[Obsidian](${url})\n${task.content}`
				await client.updateTask(task)

				if (this.settings.enableDidaTaskLink) {
					await this.createTaskLink(task.link, ctx.getSelection(), ctx.getCurrentLine(), ctx)
				}

				new Notice(`Task "${task.title}" linked`)
			}
		})


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new Dida365PluginSettingTab(this.app, this));
	}


	private async createTaskLink(taskLink: string, selection: EditorText, line: EditorText, ctx: EditorContext) {
		if (this.settings.enableSelectionToDidaTaskLink && !selection.isEmpty()) {
			selection.addLink(taskLink);
		} else if (this.settings.enableLineToDidaTaskLink && !line.isEmpty()) {
			line.addLink(taskLink);
		} else if (this.settings.enableFrontMatterToDidaTaskLink) {
			await ctx.addFrontmatterProperty("dida-task", taskLink);
		} else {
			const text = `[dida-task](${taskLink})`;
			ctx.insertTextAtCursor(text);
		}
	}

	private async createProjectLink(projectLink: string, ctx: EditorContext) {
		if (this.settings.enableFrontMatterToDidaProjectLink) {
			await ctx.addFrontmatterProperty("dida-project", projectLink)
		}
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
			.setDesc('Email or Phone Number')
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


		new Setting(containerEl)
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText("Verify Credentials")
					.onClick(async () => {
						try {
							await DidaClient.verify(this.plugin.settings.username, this.plugin.settings.password)
							new Notice("Verify credentials success!")
						} catch (e) {
							new Notice("Verify credentials failed: " + e.message)

						}
					})
			})

		this.containerEl.createEl('h2', { text: 'General' })

		new Setting(containerEl)
			.setName("Enable input prompt")
			.setDesc("If enabled, the plugin will prompt you for input when creating a project/task.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableInputPrompt)
				.onChange(async (value) => {
					this.plugin.settings.enableInputPrompt = value;
					await this.plugin.saveSettings();
				}));

		this.containerEl.createEl('h2', { text: 'Project' })
		new Setting(containerEl)
			.setName("Add Dida365 project link to frontmatter")
			.setDesc("If enabled, the plugin will add a link to the Dida365 project in the frontmatter of the note.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFrontMatterToDidaProjectLink)
				.onChange(async (value) => {
					this.plugin.settings.enableFrontMatterToDidaProjectLink = value;
					await this.plugin.saveSettings();
				}));

		this.containerEl.createEl('h2', { text: 'Task' })
		new Setting(containerEl)
			.setName('Enable Dida365 task link')
			.setDesc('If enabled, the plugin will attempt to create a link to Dida365 task depends on the settings specified below.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDidaTaskLink)
				.onChange(async (value) => {
					this.plugin.settings.enableDidaTaskLink = value;
					await this.plugin.saveSettings();
					// force refresh
					this.display()
				}));

		if (this.plugin.settings.enableDidaTaskLink) {

			new Setting(containerEl)
				.setName('Enable transform selection to Dida365 task link')
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

