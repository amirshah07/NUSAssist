import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import ConfirmModal from "../Roadmap/ConfirmModal"
import "./Navbar.css"

export default function Navbar() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    
    // Handle window resize and determine if it's mobile device
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        handleResize();
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                // Still proceed with local cleanup even if Supabase logout fails
            }
            
            localStorage.clear();
            sessionStorage.clear();
            
            navigate('/login', { replace: true });
            
        } catch (error) {
            // Fallback: still clear local storage and redirect
            localStorage.clear();
            sessionStorage.clear();
            navigate('/login', { replace: true });
        } finally {
            setShowLogoutModal(false);
        }
    };

    const cancelLogout = () => {
        setShowLogoutModal(false);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const menu = document.getElementById('mobile-menu');
            const hamburger = document.getElementById('hamburger-icon');
            
            if (menuOpen && menu && hamburger &&
                !menu.contains(event.target as Node) &&
                !hamburger.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    const handleLinkClick = () => {
        setMenuOpen(false);
    };

    return (
        <header className="navbar">
          <div className="navbar-container">
            <div className="navbar-left">
                <Link to="/homepage">
                    <h1>NUSAssist</h1>
                </Link>
            </div>
            
            <div className="navbar-center desktop-menu">
                <Link to="/timetable">My Timetable</Link>
                <Link to="/gpacalculator">GPA Calculator</Link>
                <Link to="/roadmap">University Roadmap</Link>
            </div>

            <div 
                id="mobile-menu" 
                className={`mobile-menu ${menuOpen ? 'open' : ''} ${isMobile ? 'full-width' : 'popup'}`}
            >
                <Link to="/timetable" onClick={handleLinkClick}>My Timetable</Link>
                <Link to="/gpacalculator" onClick={handleLinkClick}>GPA Calculator</Link>
                <Link to="/roadmap" onClick={handleLinkClick}>University Roadmap</Link>
            </div>

            <div className="navbar-right">
                <div 
                    id="hamburger-icon" 
                    className={`hamburger-menu ${menuOpen ? 'active' : ''}`} 
                    onClick={toggleMenu}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <button 
                    className="logout-button" 
                    onClick={handleLogout}
                >
                    log out
                </button>
            </div>
          </div>
          
          <ConfirmModal
            isOpen={showLogoutModal}
            onClose={cancelLogout}
            onConfirm={confirmLogout}
            title="Confirm Logout"
            message="Are you sure you want to log out? You'll need to log in again to access your account."
            confirmText="Log Out"
            cancelText="Cancel"
          />
        </header>
    );
}