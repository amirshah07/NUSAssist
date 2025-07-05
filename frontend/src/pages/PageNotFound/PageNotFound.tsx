import "./PageNotFound.css"
import { useNavigate } from 'react-router-dom';

export default function PageNotFound() {
  const navigate = useNavigate();

  return (
    <div className="page-not-found">
      <div className="error-content">
        <h1 className="error-code">404</h1>
        <h2 className="error-title">Page Not Found</h2>
        <p className="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button 
          className="back-home-button"
          onClick={() => navigate('/homepage')}
        >
          Back to Homepage
        </button>
      </div>
    </div>
  );
}