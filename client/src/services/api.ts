import axios from 'axios';
import { SBStory, SBStoryObject } from '../../../shared/types/supabase';
import { Story } from '../../../shared/types/interactiveFiction';

const api = axios.create({
	baseURL: 'http://localhost:3001/api',
	withCredentials: true,
});

export const authService = {
	signup: async (email: string, password: string) => {
		const response = await api.post('/auth/signup', { email, password });
		return response.data;
	},
	login: async (email: string, password: string) => {
		const response = await api.post('/auth/login', { email, password });
		return response.data;
	},
	logout: async () => {
		const response = await api.post('/auth/logout');
		return response.data;
	},
	getCurrentUser: async () => {
		const response = await api.get('/auth/me');
		return response.data;
	},
};

export const storyService = {
	uploadStory: async (storyText: string) => {
		const response = await api.post('/parser/upload', { storyText });
		return response.data;
	},
	checkStoryStatus: async (storyId: string) => {
		const response = await api.get(`/parser/status/${storyId}`);
		return response.data;
	},
	getStory: async (storyId: string): Promise<{ story: SBStory; objects: SBStoryObject[] }> => {
		const response = await api.get(`/parser/${storyId}`);
		return response.data.data;
	},
};

// Use the stories route defined in server/src/index.ts
const storyUrl = '/stories';
export const interactiveStoryService = {
	getStories: async () => {
		const response = await api.get(storyUrl);
		return response.data;
	},

	createStory: async (storyPrompt: string) => {
		const response = await api.post(storyUrl + '/new', { storyPrompt });
		return response.data;
	},

	getStoryById: async (storyId: string): Promise<Story> => {
		const response = await api.get(storyUrl + `/${storyId}`);
		return response.data.data;
	},

	deleteStory: async (storyId: string) => {
		const response = await api.delete(storyUrl + `/${storyId}`);
		return response.data;
	},
};

export default api;
