import { useState, useEffect } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabaseClient.ts";
import SuccessModal from "./SuccessModal.tsx";
import Loading from "../../components/Loading/Loading.tsx";
import "./LoginRegister.css" 

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [forgotPasswordError, setForgotPasswordError] = useState("");
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [showResetEmailSuccess, setShowResetEmailSuccess] = useState(false);

    useEffect(() => {
        if (showForgotPassword) {
            setLoginError("");
        }
    }, [showForgotPassword]);

    const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setEmail(e.target.value);
        setLoginError("");
    };

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setPassword(e.target.value);
        setLoginError("");
    };

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setIsLoading(true);
        setLoginError("");
        
        if (!email || !password) {
            setLoginError("Please fill in all fields");
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) {
                if (error.message.includes("Email not confirmed")) {
                    setLoginError("Please verify your email before logging in. Check your inbox for the verification link.");
                } else if (error.message.includes("Invalid login credentials")) {
                    setLoginError("Invalid email or password");
                } else {
                    setLoginError(error.message);
                }
                setIsLoading(false);
                return;
            }

            navigate('/', { replace: true });
            
        } catch (error) {
            setLoginError("An unexpected error occurred");
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setIsResettingPassword(true);
        setForgotPasswordError("");

        if (!forgotPasswordEmail) {
            setForgotPasswordError("Please enter your email address");
            setIsResettingPassword(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(forgotPasswordEmail)) {
            setForgotPasswordError("Please enter a valid email address");
            setIsResettingPassword(false);
            return;
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
                redirectTo: `${window.location.origin}/resetpassword`,
            });

            if (error) {
                setForgotPasswordError(error.message);
            } else {
                setShowResetEmailSuccess(true);
            }
        } catch (error) {
            setForgotPasswordError("An unexpected error occurred");
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handleForgotPasswordClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setLoginError("");
        setForgotPasswordError("");
        setForgotPasswordEmail("");
        setShowForgotPassword(true);
    };

    const handleBackToLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setForgotPasswordEmail("");
        setForgotPasswordError("");
        setLoginError("");
        setShowForgotPassword(false);
    };

    if (showResetEmailSuccess) {
        return (
            <SuccessModal 
                type="passwordReset" 
                email={forgotPasswordEmail}
                onButtonClick={() => {
                    setShowResetEmailSuccess(false);
                    setShowForgotPassword(false);
                    setForgotPasswordEmail("");
                    setForgotPasswordError("");
                }}
            />
        );
    }

    if (showForgotPassword) {
        return (
            <main>
                {isResettingPassword && <Loading />}
                <form onSubmit={handleForgotPassword} noValidate>
                    <div className="form-heading">
                        <h1>NUSAssist</h1>
                        <h2>Reset Password</h2>
                    </div>
                    <div className="input-container">
                        <input
                            type="email"
                            id="forgotEmail"
                            name="forgotEmail"
                            placeholder="Enter your email address"
                            value={forgotPasswordEmail}
                            onChange={(e) => {
                                setForgotPasswordEmail(e.target.value);
                                setForgotPasswordError("");
                            }}
                            className={forgotPasswordError ? "input-error" : ""}
                        />
                        
                        {forgotPasswordError && (
                            <div className="error-message">{forgotPasswordError}</div>
                        )}
                        
                        <button type="submit" disabled={isResettingPassword}>
                            Send Reset Email
                        </button>
                        
                        <button 
                            type="button" 
                            className="back-to-login-btn"
                            onClick={handleBackToLogin}
                        >
                            Back to Login
                        </button>
                    </div>
                </form>
            </main>
        );
    }

    return (
        <main>
            {isLoading && <Loading />}
            <form onSubmit={handleSubmit} noValidate>
                <div className="form-heading">
                    <h1>NUSAssist</h1>
                    <h2>Login</h2>
                </div>
                <div className="input-container">
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={handleEmailChange}
                        className={loginError ? "input-error" : ""}
                    />
                    
                    <div className="password-input-container">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={handlePasswordChange}
                            className={loginError ? "input-error" : ""}
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
                    
                    <div className="error-forgot-container">
                        <div className="error-message-wrapper">
                            {loginError && (
                                <div className="error-message">{loginError}</div>
                            )}
                        </div>
                        <button 
                            type="button" 
                            className="forgot-password-link"
                            onClick={handleForgotPasswordClick}
                        >
                            Forgot Password?
                        </button>
                    </div>
                    
                    <button type="submit" disabled={isLoading}>
                        Log In
                    </button>
                </div>
                <p>
                    New User? <a href="/register">Register</a>
                </p>
            </form>
        </main>
    );
}