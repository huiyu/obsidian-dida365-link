import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian'
import * as util from './util'

const HEADER_X_DEVICE = '{"platform":"web","os":"macOS 10.15.7","device":"Chrome 114.0.0.0","name":"","version":4562,"id":"64217d45c3630d2326189adc","channel":"website","campaign":"","websocket":""}'

export interface DidaSession {
	username: string;
	password: string;
	token: string;

	// Save the session to the storage
	save(): Promise<void>;
}

export interface DidaTask {
	id: string;
	title: string;
	content: string;
	tags: string[];
	projectId: string;
	link: string;
}

export interface DidaProject {
	id: string;
	title: string;
	link: string;
}

export class DidaClient {


	session: DidaSession

	private constructor(session: DidaSession) {
		this.session = session
	}

	public static async verify(username: string, password: string): Promise<string> {
		const req = {
			username: username,
			password: password
		}

		const resp = await requestUrl({
			url: "https://api.dida365.com/api/v2/user/signon?wc=true&remember=true",
			method: "POST",
			body: JSON.stringify(req),
			headers: {
				"Content-Type": "application/json",
			},
		})

		return resp.json.token
	}

	public static async of(session: DidaSession) {

		const client = new DidaClient(session)
		if (util.isBlankString(session.token)) {
			await client.login()
		}

		return client
	}

	private async login(): Promise<void> {
		this.session.token = await DidaClient.verify(this.session.username, this.session.password)
		await this.session.save()
	}

	async createProject(project: { title: string }): Promise<DidaProject> {
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


	async getInboxProject(): Promise<DidaProject> {
		const resp = await this.retryRequestUrl({
			url: "https://api.dida365.com/api/v2/user/preferences/settings?includeWeb=true",
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"x-device": HEADER_X_DEVICE,
				"cookie": "t=" + this.session.token,
			}
		})

		return {
			title: "Inbox",
			id: resp.json.defaultProjectId,
			link: "https://dida365.com/webapp/#p/inbox/tasks",
		}
	}

	async listProjects(): Promise<DidaProject[]> {
		const resp = await this.retryRequestUrl({
			url: "https://api.dida365.com/api/v2/projects",
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"x-device": HEADER_X_DEVICE,
				"cookie": "t=" + this.session.token,
			}
		})

		return resp.json.map((item: { id: string, name: string }) =>
		({
			id: item.id,
			title: item.name,
			link: `https://dida365.com/webapp/#p/${item.id}/tasks`
		}))
	}

	async createTask(task: { title: string, tags: string[], content?: string, projectId?: string }): Promise<DidaTask> {
		const req = {
			add: [{
				content: task.content,
				title: task.title,
				tags: task.tags,
				projectId: task.projectId, // if not set, will be added to inbox
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
			content: task.content || "",
			tags: task.tags,
			link: link,
			projectId: task.projectId || (await this.getInboxProject()).id,
		}
	}

	async updateTask(task: { id: string, title: string, tags: string[], content: string, projectId: string }): Promise<DidaTask> {
		const req = {
			update: [{
				id: task.id,
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

		const link = this.getTaskUrl({ taskId: task.id, projectId: task.projectId })

		return { ...task, ...{ link: link } };
	}

	async listTasks(): Promise<DidaTask[]> {

		const resp = await this.retryRequestUrl({
			url: "https://api.dida365.com/api/v2/batch/check/0",
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"x-device": HEADER_X_DEVICE,
				"cookie": "t=" + this.session.token,
			}
		})

		return resp.json.syncTaskBean.update.map((item: { id: string; title: string; content: string; tags: string[]; projectId: string; }) =>
		({
			id: item.id,
			title: item.title,
			content: item.content,
			tags: item.tags,
			projectId: item.projectId,
			link: this.getTaskUrl({ taskId: item.id, projectId: item.projectId }),
		}))
	}

	private getTaskUrl(task: { taskId: string, projectId?: string }): string {
		if (util.isBlankString(task.projectId)) {
			return `https://dida365.com/webapp/#p/inbox/tasks/${task.taskId}`
		} else {
			return `https://dida365.com/webapp/#p/${task.projectId}/tasks/${task.taskId}`
		}
	}

	// retry request after login
	private async retryRequestUrl(requestParam: RequestUrlParam): Promise<RequestUrlResponse> {
		try {
			return await requestUrl(requestParam)
		} catch (e) {
			console.log("Retrying request after login")
			await this.login()
			return await requestUrl(requestParam)
		}
	}
}

