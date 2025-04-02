import axios from 'axios';
import { SBStory, SBStoryObject } from '../../../shared/types/supabase';

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
		const response = await api.post('/story/upload', { storyText });
		return response.data;
	},
	checkStoryStatus: async (storyId: string) => {
		const response = await api.get(`/story/status/${storyId}`);
		return response.data;
	},
	getStory: async (storyId: string): Promise<{ story: SBStory; objects: SBStoryObject[] }> => {
		const response = await api.get(`/story/${storyId}`);
		return response.data.data;
	},
};

export default api;
