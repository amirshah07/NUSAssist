import Navbar from "../../components/Navbar/Navbar";
import Dashboard from "../../components/Dashboard/Dashboard";
import "./Homepage.css"

export default function Homepage() {
    return(
        <div className="homepage">
            <Navbar />
            <Dashboard />
        </div>
    )
}