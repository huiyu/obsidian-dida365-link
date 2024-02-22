import { App, Modal, SuggestModal, Setting } from "obsidian"
import { isBlankString } from "./util"


export async function queryPromot<T>(app: App, suggest: (query: string) => Promise<T[]>): Promise<T> {
	const modal = new GeneralQueryModal(app, suggest);
	return modal.waitForClose;
}

export async function inputPrompt(app: App, name: string, value: string): Promise<string> {
	const modal = new GeneralInputModal(app, name, value);
	return modal.waitForClose
}

export async function formPrompt<T>(app: App, title: string, fields: FormField[]): Promise<T> {
	const modal = new GenericFormModal(app, title, fields);
	return modal.waitForClose;
}

class GeneralQueryModal<T> extends SuggestModal<T> {

	waitForClose: Promise<T>;
	resolvePromise: (input: any) => void;
	rejectPromise: (reason: any) => void;
	suggest: (query: string) => Promise<T[]>;

	constructor(app: App, suggest: (query: string) => Promise<T[]>) {
		super(app);
		this.suggest = suggest;
		this.waitForClose = new Promise((resolve, reject) => {
			this.resolvePromise = resolve;
			this.rejectPromise = reject;
		})
		this.open();
	}

	getSuggestions(query: string): Promise<T[]> {
		if (isBlankString(query)) {
			return Promise.resolve([]);
		} else {
			return this.suggest(query);
		}
	}

	onChooseSuggestion(item: T, evt: MouseEvent | KeyboardEvent): void {
		this.resolvePromise(item);
	}

	renderSuggestion(item: T, el: HTMLElement): void {
		const name = item.title;
		el.setText(name);
	}
}

class GeneralInputModal extends Modal {

	waitForClose: Promise<string>;
	resolvePromise: (input: any) => void;
	rejectPromise: (reason: any) => void;

	name: string
	value: string

	constructor(app: App, name: string, value: string) {
		super(app)
		this.waitForClose = new Promise((resolve, reject) => {
			this.resolvePromise = resolve;
			this.rejectPromise = reject;
		})
		this.name = name;
		this.value = value;
		this.open();
	}

	onOpen() {
		let { contentEl } = this;

		contentEl.createEl("h2", { text: "Input" });

		new Setting(contentEl)
			.setName(this.name)
			.addText(value => value
				.setValue(this.value)
				.onChange(value => this.value = value)
			);

		contentEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				this.close()
				this.resolvePromise(this.value)
			}
		})

	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty()
	}
}

class FormField {

	name: string
	type: "text" | "number" | "select" | "checkbox"
	label: string
	value: string | number | boolean
	select?: {
		suggest: (query: string) => Promise<any[]>
		show: (value: any) => boolean | string | number
		value: (value: any) => boolean | string | number
	}
}


class GenericFormModal<T> extends Modal {

	waitForClose: Promise<T>;
	resolvePromise: (input: any) => void;
	rejectPromise: (reason: any) => void;

	title: string
	fields: FormField[]


	constructor(app: App, title: string, fields: FormField[]) {
		super(app)
		this.title = title;
		this.fields = fields;

		this.waitForClose = new Promise((resolve, reject) => {
			this.resolvePromise = resolve;
			this.rejectPromise = reject;
		})
		this.open();
	}

	submit() {

		const result: any = {}

		this.fields.forEach(field => {
			result[field.name] = field.value
		})

		this.resolvePromise(result)
	}

	onOpen() {
		let { contentEl } = this;

		contentEl.createEl("h2", { text: this.title });

		this.fields.forEach(field => {

			switch (field.type) {
				case "number":
				case "text":
					new Setting(contentEl)
						.setName(field.label)
						.addText(value => value
							.setValue(field.value)
							.onChange(value => field.value = value)
						);
					break;
				case "checkbox":
					new Setting(contentEl)
						.setName(field.label)
						.addToggle(value => value
							.setValue(field.value)
							.onChange(value => field.value = value)
						);
					break;
				case "select":

					break;
			}

			new Setting(contentEl)
				.addButton((btn) => {
					btn.setButtonText("Submit")
						.setCta()
						.onClick(() => {
							this.close()
							this.submit()
						})
				})

			contentEl.addEventListener("keydown", (evt) => {
				console.log(evt)
				if (evt.key === "Enter") {
					evt.preventDefault();
					this.close()
					this.submit()
				}
			})

		})

	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty()
	}
}
