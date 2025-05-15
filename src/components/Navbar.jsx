import profile from "../assets/images/emptyprofile.jpg";

export default function Navbar() {
    return (
        <header className="navbar">
          <div className="navbar-container">
            <div className="navbar-left">
                <a href="/homepage">
                <h1>NUSAssist</h1>
                </a>
            </div>
            <div className="navbar-center">
                <a href="/timetable">
                My Timetable
                </a>
                <a href="/gpacalculator">
                GPA Calculator
                </a>
                <a href="/roadmap">
                University Roadmap
                </a>
            </div>

            <div className="navbar-right">
                <a href="/profile">
                <img src={profile} alt="Profile"/>
                </a>
            </div>
          </div>
        </header>
    );
}