import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/auth.css';

import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Home from './components/Home';
import ProtectedRoute from './components/ProtectedRoute';
import StoryViewer from './components/StoryViewer';
import StoryUpload from './components/StoryUpload';
import TestGraph from './components/TestGraph';
import InteractiveStory from './components/InteractiveStory';
import InteractiveStoryList from './components/InteractiveStoryList';
import InteractiveStoryCreate from './components/InteractiveStoryCreate';

function App() {
	return (
		<AuthProvider>
			<Router>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/signup" element={<Signup />} />
					<Route
						path="/upload"
						element={
							<ProtectedRoute>
								<StoryUpload />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/"
						element={
							<ProtectedRoute>
								<Home />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/view/:storyId"
						element={
							<ProtectedRoute>
								<StoryViewer />
							</ProtectedRoute>
						}
					/>
					<Route path="/test-graph" element={<TestGraph />} />
					
					{/* Interactive Fiction Routes */}
					<Route
						path="/interactive"
						element={
							<ProtectedRoute>
								<InteractiveStoryList />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/interactive/create"
						element={
							<ProtectedRoute>
								<InteractiveStoryCreate />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/interactive/:storyId"
						element={
							<ProtectedRoute>
								<InteractiveStory />
							</ProtectedRoute>
						}
					/>
					
					<Route path="*" element={<Navigate to="/" />} />
				</Routes>
			</Router>
		</AuthProvider>
	);
}

export default App;