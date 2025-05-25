import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import googleLogo from "../assets/images/google.png";
import "../index.css";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setEmail(e.target.value);
    };

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setPassword(e.target.value);
    };

    const googleLogin = (): void => {
        console.log("Google login clicked");
        // For now just log that Google login was clicked
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) {
            console.error("Error logging in:", error.message);
            return;
        } else {
            window.location.href = "/"; 
        }
        console.log("Form submitted");
        console.log("Email:", email);
        console.log("Password:", password);
    };

    return (
        <main>
            <form onSubmit={handleSubmit}>
                <div className="login-heading">
                    <div>
                        <h1>NUSAssist</h1>
                    </div>
                    <h2>Email Login</h2>
                </div>
                <div className="input-container">
                    <input
                        type="text"
                        id="email"
                        name="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={handleEmailChange}
                    />
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={handlePasswordChange}
                    />
                    <button type="submit">
                        Log In
                    </button>
                </div>

                <div className="divider">
                    <hr />
                    <span>OR</span>
                    <hr />
                </div>
                <h2>Google Login</h2>
                <img
                    src={googleLogo}
                    alt="Google Logo"
                    className="google-logo"
                    onClick={googleLogin}
                />
                <p>
                    New User? <a href="/register">Register</a>
                </p>
            </form>
        </main>
    );
}