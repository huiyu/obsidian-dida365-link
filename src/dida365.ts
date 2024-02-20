import { requestUrl, RequestUrlParam, RequestUrlResponsePromise } from 'obsidian'
import * as util from './util'

const HEADER_X_DEVICE = '{"platform":"web","os":"macOS 10.15.7","device":"Chrome 114.0.0.0","name":"","version":4562,"id":"64217d45c3630d2326189adc","channel":"website","campaign":"","websocket":""}'

interface DidaSession {
	username: string;
	password: string;
	token: string;

	// Save the session to the storage
	save(): Promise<void>;
}

class DidaClient {

	session: DidaSession

	private constructor(session: DidaSession) {
		this.session = session
	}

	public static async of(session: DidaSession) {

		const client = new DidaClient(session)
		if (util.isBlankString(session.token)) {
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
		const resp = await this.retryRequestUrl({
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

		const id = Object.keys(resp.json["id2etag"])[0]
		const link = `https://dida365.com/webapp/#p/${id}/tasks`

		return {
			id: id,
			title: project.title,
			link: link,
		}
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
		const req = {
			add: [{
				content: task.content,
				title: task.title,
				tags: task.tags,
				projectId: task.projectId,
			}]
		}

		const resp = await this.retryRequestUrl({
			url: "https://api.dida365.com/api/v2/batch/task",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-device": HEADER_X_DEVICE,
				"cookie": "t=" + this.session.token,
			},
			body: JSON.stringify(req)
		})


		const id = Object.keys(resp.json["id2etag"])[0]
		const link = this.getTaskUrl({ taskId: id, projectId: task.projectId })

		return {
			id: id,
			title: task.title,
			content: task.content,
			tags: task.tags,
			link: link,
			projectId: task.projectId,
		}
	}


	private getTaskUrl(task: { taskId: string, projectId?: string }) {
		if (util.isBlankString(task.projectId)) {
			return `https://dida365.com/webapp/#p/inbox/tasks/${task.taskId}`
		} else {
			return `https://dida365.com/webapp/#p/${task.projectId}/tasks/${task.taskId}`
		}
	}

	// retry request after login
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

export { DidaClient, DidaSession }
