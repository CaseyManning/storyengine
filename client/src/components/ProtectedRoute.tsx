import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, login } = useAuth();
  const [tryLogin, setTryLogin] = useState(false);

  useEffect(() => {
    if (tryLogin) {
      return;
    }
    setTryLogin(true);
    if (!user) {
      // Attempt to log in with test credentials - hot reload is somehow breaking the login state
      console.log("trying to log in");
      login("kcgrind@gmail.com", "foobar").then((response: any) => {
        if (!response.user) {
          return <Navigate to="/login" />;
        }
      }).catch(() => {
        return <Navigate to="/login" />;
      });
    }
  }, [user, login, tryLogin]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;