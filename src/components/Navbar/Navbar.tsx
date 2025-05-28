import { useState, useEffect } from "react";
import profile from "../../assets/images/emptyprofile.png";
import "./Navbar.css"

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // Function to handle window resize and determine if it's a mobile device
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        // Set initial value
        handleResize();
        
        // Add event listener
        window.addEventListener('resize', handleResize);
        
        // Clean up
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Toggle menu
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
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
    
    // Cleanup function
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
    }, [menuOpen]);

    return (
        <header className="navbar">
          <div className="navbar-container">
            <div className="navbar-left">
                <a href="/homepage">
                    <h1>NUSAssist</h1>
                </a>
            </div>
            
            {/* Regular navbar for larger screens */}
            <div className="navbar-center desktop-menu">
                <a href="/timetable">My Timetable</a>
                <a href="/gpacalculator">GPA Calculator</a>
                <a href="/roadmap">University Roadmap</a>
            </div>

            {/* Mobile menu */}
            <div 
                id="mobile-menu" 
                className={`mobile-menu ${menuOpen ? 'open' : ''} ${isMobile ? 'full-width' : 'popup'}`}
            >
                <a href="/timetable">My Timetable</a>
                <a href="/gpacalculator">GPA Calculator</a>
                <a href="/roadmap">University Roadmap</a>
            </div>

            <div className="navbar-right">
                {/* Hamburger icon */}
                <div 
                    id="hamburger-icon" 
                    className={`hamburger-menu ${menuOpen ? 'active' : ''}`} 
                    onClick={toggleMenu}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <a href="/profile">
                    <img src={profile} alt="Profile"/>
                </a>
            </div>
          </div>
        </header>
    );
}