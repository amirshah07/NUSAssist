import { useState, useEffect } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabaseClient.ts";
import SuccessModal from "./SuccessModal.tsx";
import Loading from "../../components/Loading/Loading.tsx";
import "./LoginRegister.css";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [showPasswordUpdateSuccess, setShowPasswordUpdateSuccess] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [isValidSession, setIsValidSession] = useState(false);

    useEffect(() => {
        const checkAuthAndTokens = async () => {
            // Store the original hash before anything clears it
            const originalHash = window.location.hash;
            
            // Extract tokens from URL hash
            const hashParams = new URLSearchParams(originalHash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');

            // Check if this is a valid reset password flow
            if (type === 'recovery' && accessToken && refreshToken) {
                try {
                    // Set the session
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    
                    if (error) {
                        console.error('Session error:', error);
                        setIsValidating(false);
                        navigate('/login');
                        return;
                    }
                    
                    // Get the user's email from the session
                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    if (!userError && user?.email) {
                        setUserEmail(user.email);
                        setIsValidSession(true); // Mark session as valid for password reset
                    }
                    
                    // Clear the URL hash
                    if (window.history.replaceState) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                    
                    setIsValidating(false);
                    return;
                } catch (error) {
                    console.error('Error setting session:', error);
                    setIsValidating(false);
                    navigate('/login');
                    return;
                }
            }

            // If no recovery tokens, check if user is in a valid reset session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setIsValidating(false);
                navigate('/login');
                return;
            }

            // Check if this is a recent recovery session (optional - you can add time checks here)
            setIsValidating(false);
        };

        checkAuthAndTokens();
    }, [navigate]);

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setPassword(e.target.value);
        setError("");
    };

    const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setConfirmPassword(e.target.value);
        setError("");
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
        setError("");

        // Validation
        if (!password || !confirmPassword) {
            setError("Please fill in all fields");
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError(error.message);
                setIsLoading(false);
                return;
            }

            setShowPasswordUpdateSuccess(true);
            setIsLoading(false);

        } catch (error) {
            setError("An unexpected error occurred");
            setIsLoading(false);
        }
    };

    // Show password update success modal
    if (showPasswordUpdateSuccess) {
        return (
            <SuccessModal 
                type="passwordUpdate"
                email={userEmail}
                onButtonClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/login');
                }}
            />
        );
    }

    // Show loading while validating tokens
    if (isValidating) {
        return (
            <main>
                <Loading />
            </main>
        );
    }

    // If we don't have a valid session after validation, they shouldn't be here
    if (!isValidSession && !userEmail) {
        navigate('/login');
        return null;
    }

    return (
        <main>
            {isLoading && <Loading />}
            <form onSubmit={handleSubmit} noValidate>
                <div className="form-heading">
                    <h1>NUSAssist</h1>
                    <h2>Create New Password</h2>
                </div>
                <div className="input-container">
                    <div className="password-input-container">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            placeholder="Enter new password"
                            value={password}
                            onChange={handlePasswordChange}
                            className={error ? "input-error" : ""}
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

                    <div className="password-input-container">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            id="confirmPassword"
                            name="confirmPassword"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={handleConfirmPasswordChange}
                            className={error ? "input-error" : ""}
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

                    <div>
                        {error && (
                            <div className="error-message">{error}</div>
                        )}
                    </div>

                    <button type="submit" disabled={isLoading}>
                        Update Password
                    </button>
                </div>
            </form>
        </main>
    );
}