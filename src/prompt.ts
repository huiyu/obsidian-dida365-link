import { App, Modal, SuggestModal, Setting } from "obsidian"
import { isBlankString } from "./util"


export async function queryPromot<T extends { title: string }>(app: App, suggest: (query: string) => Promise<T[]>): Promise<T> {
	const modal = new GeneralQueryModal(app, suggest);
	return modal.waitForClose;
}

export async function inputPrompt(app: App, name: string, value: string): Promise<string> {
	const modal = new GeneralInputModal(app, name, value);
	return modal.waitForClose
}

class GeneralQueryModal<T extends { title: string }> extends SuggestModal<T> {

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

