import { requestUrl, RequestUrlParam, RequestUrlResponsePromise } from 'obsidian'

const HEADER_X_DEVICE = '{"platform":"web","os":"macOS 10.15.7","device":"Chrome 114.0.0.0","name":"","version":4562,"id":"64217d45c3630d2326189adc","channel":"website","campaign":"","websocket":""}'

interface DidaSession {

	username: string;
	password: string;
	token: string;

	save(): Promise<void>;
}

class DidaClient {

	session: DidaSession

	private constructor(session: DidaSession) {
		this.session = session
	}

	public static async of(session: DidaSession) {

		const client = new DidaClient(session)
		if (isEmptyString(session.token)) {
			await client.login()
		}

		return client
	}

	private async login() {
		const req = {
			username: this.session.username,
			password: this.session.password
		}

		const resp = await requestUrl({
			url: "https://api.dida365.com/api/v2/user/signon?wc=true&remember=true",
			method: "POST",
			body: JSON.stringify(req),
			headers: {
				"Content-Type": "application/json",
			},
		})

		this.session.token = resp.json.token

		await this.session.save()
	}

	async createProject(project: { title: string }) {
		await this.retryRequestUrl({
			url: "https://api.dida365.com/api/v2/batch/project",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-device": HEADER_X_DEVICE,
				"cookie": "t=" + this.session.token,
			},
			body: JSON.stringify({
				add: [{
					name: project.title
				}]
			})
		})
	}

	async getInboxProjectId() {
		const resp = await this.retryRequestUrl({
			url: "https://api.dida365.com/api/v2/user/preferences/settings?includeWeb=true",
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"x-device": HEADER_X_DEVICE,
				"cookie": "t=" + this.session.token,
			}
		})

		return resp.json.defaultProjectId
	}

	async listProjects() {
		const resp = await this.retryRequestUrl({
			url: "https://api.dida365.com/api/v2/projects",
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"x-device": HEADER_X_DEVICE,
				"cookie": "t=" + this.session.token,
			}
		})

		return resp.json.map(item => ({ id: item.id, name: item.name }))
	}

	async createTask(task: { title: string, tags: string[], content?: string, projectId?: string }) {
		if (isEmptyString(task.projectId)) {
			task.projectId = await this.getInboxProjectId()
		}

		const req = {
			add: [{
				content: task.content,
				title: task.title,
				tags: task.tags,
				projectId: task.projectId,
			}]
		}

		await this.retryRequestUrl({
			url: "https://api.dida365.com/api/v2/batch/task",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-device": HEADER_X_DEVICE,
				"cookie": "t=" + this.session.token,
			},
			body: JSON.stringify(req)
		})
	}


	private async retryRequestUrl(requestParam: RequestUrlParam): RequestUrlResponsePromise {
		try {
			return await requestUrl(requestParam)
		} catch (e) {
			console.log("Retrying request after login")
			await this.login()
			return await requestUrl(requestParam)
		}
	}
}

function isEmptyString(str: string | null | undefined): boolean {
	return str === '';
}

export { DidaClient, DidaSession }
