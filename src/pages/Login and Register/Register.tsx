import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./LoginRegister.css" 


export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
    // Check if passwords match whenever password changes
    if (confirmPassword) {
      setPasswordsMatch(e.target.value === confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setConfirmPassword(e.target.value);
    // Check if passwords match whenever confirm password changes
    setPasswordsMatch(password === e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password || !confirmPassword) {
      console.log("Please fill in all fields");
      return;
    }
    
    if (!passwordsMatch) {
      console.log("Passwords do not match");
      return;
    }
    const {error} = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    
    if (error) {
      console.error("Error signing up:", error.message);
      return;
    } else {
      console.log("User registered successfully");
    }
    console.log("Registration form submitted");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Confirm Password:", confirmPassword);
  };

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <div className="login-heading">
          <div>
            <h1>NUSAssist</h1>
          </div>
          <h2>Create Account</h2>
        </div>
        <div className="input-container">
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={email}
            onChange={handleEmailChange}
            required
          />
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Create a password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            required
            className={!passwordsMatch && confirmPassword ? "password-mismatch" : ""}
          />
          {!passwordsMatch && confirmPassword && (
            <div className="error-message">Passwords do not match</div>
          )}
          <button type="submit">
            Register Account
          </button>
        </div>

        <p>
          Already have an account? <a href="/login">Log In</a>
        </p>
      </form>
    </main>
  );
}