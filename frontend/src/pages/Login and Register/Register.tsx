import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabaseClient.ts";
import SuccessModal from "./SuccessModal.tsx"; 
import Loading from "../../components/Loading/Loading.tsx";
import "./LoginRegister.css" 

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    setEmailError("");
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
    setPasswordError("");
    if (confirmPassword) {
      setPasswordsMatch(e.target.value === confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setConfirmPassword(e.target.value);
    setPasswordsMatch(password === e.target.value);
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setEmailError("");
    setPasswordError("");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        if (error.message.includes("Password should be")) {
          setPasswordError("Password must be at least 8 characters long");
        } else {
          setEmailError(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        setEmailError("Email is already registered");
        setIsLoading(false);
        return;
      }

      setShowSuccess(true);
      setIsLoading(false);
      
    } catch (error) {
      setEmailError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return <SuccessModal type="registration" email={email} />;
  }

  return (
    <main>
      {isLoading && <Loading />}
      <form onSubmit={handleSubmit}>
        <div className="form-heading">
          <h1>NUSAssist</h1>
          <h2>Register</h2>
        </div>
        <div className="input-container">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={handleEmailChange}
            required
            className={emailError ? "input-error" : ""}
          />
          {emailError && (
            <div className="error-message">{emailError}</div>
          )}
          
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={password}
              onChange={handlePasswordChange}
              required
              className={passwordError ? "input-error" : ""}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePassword}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {passwordError && (
            <div className="error-message">{passwordError}</div>
          )}
          
          <div className="password-input-container">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              className={!passwordsMatch && confirmPassword ? "input-error" : ""}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={toggleConfirmPassword}
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {!passwordsMatch && confirmPassword && (
            <div className="error-message">Passwords do not match</div>
          )}
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Register Account"}
          </button>
        </div>

        <p>
          Already have an account? <a href="/login">Log In</a>
        </p>
      </form>
    </main>
  );
}