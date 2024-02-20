import { App, SuggestModal } from "obsidian"


class TaskSuggestModal extends SuggestModal<string> {
	constructor(app: App) {
		super(app);
	}

	getSuggestions(query: string): Promise<string[]> {
	}

	onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
		console.log(item);
	}

	renderSuggestion(item: string, el: HTMLElement): void {
		el.setTextContent(item);
	}
}

