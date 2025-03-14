import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>StoryEngine</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>
      
      <div className="home-content">
        <h2>Welcome, {user?.email}!</h2>
        <p>This is the home page of the StoryEngine application.</p>
      </div>
    </div>
  );
};

export default Home;