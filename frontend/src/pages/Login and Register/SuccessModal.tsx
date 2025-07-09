import { useNavigate } from 'react-router-dom';
import './SuccessModal.css';

type SuccessType = 'registration' | 'passwordReset' | 'passwordUpdate';

interface SuccessModalProps {
  type: SuccessType;
  email?: string;
  onButtonClick?: () => void;
}

const SuccessModal = ({ type, email, onButtonClick }: SuccessModalProps) => {
  const navigate = useNavigate();

  const getContent = () => {
    switch (type) {
      case 'registration':
        return {
          title: 'Account Created!',
          mainText: 'We\'ve sent a verification link to:',
          instructionText: 'Check your email and click the link to activate your account. It may take a few minutes to arrive.',
          buttonText: 'Continue to Login',
          showEmail: true,
        };
      case 'passwordReset':
        return {
          title: 'Reset Email Sent!',
          mainText: 'We\'ve sent password reset instructions to:',
          instructionText: 'Check your email and follow the link to reset your password. It may take a few minutes to arrive.',
          buttonText: 'Back to Login',
          showEmail: true,
        };
      case 'passwordUpdate':
        return {
          title: 'Password Updated!',
          mainText: 'We\'ve updated the password for this email:',
          instructionText: 'You can now log in with your new password.',
          buttonText: 'Continue to Login',
          showEmail: true,
        };
      default:
        return {
          title: 'Success!',
          mainText: 'Operation completed successfully.',
          instructionText: '',
          buttonText: 'Continue',
          showEmail: false,
        };
    }
  };

  const content = getContent();

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else {
      // Default behavior: navigate to login
      navigate('/login', { replace: true });
    }
  };

  return (
    <main>
      <div className="registration-success">
        {/* Main Title */}
        <h1 className="success-title">
          {content.title}
        </h1>
        
        <p className="verification-text">
          {content.mainText}
        </p>
        
        {content.showEmail && email && (
          <p className="email-display">
            {email}
          </p>
        )}
        
        {content.instructionText && (
          <p className="instruction-text">
            {content.instructionText}
          </p>
        )}
        
        {/* Action Button */}
        <button 
          onClick={handleButtonClick}
          className="continue-button"
        >
          {content.buttonText}
        </button>
        
        {/* Footer Note */}
        <p className="footer-note">
          Need help? Email <a href="mailto:nusassist.contact@gmail.com">nusassist.contact@gmail.com</a>
        </p>
      </div>
    </main>
  );
};

export default SuccessModal;