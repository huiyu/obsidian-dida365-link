import { App, SuggestModal } from "obsidian"
import { isBlankString } from "./util"


export async function queryPromot<T>(app: App, suggest: (query: string) => Promise<T[]>): T {
	const modal = new GeneralQueryModal(app, suggest);
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


