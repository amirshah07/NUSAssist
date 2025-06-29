import Navbar from "../../components/Navbar/Navbar";
import "./Homepage.css"

export default function Homepage() {
    
    return(
        <>
            <Navbar />
            <div className="homepage-container">
                <div className="homepage-content">
                    <h1> HomePage</h1>
                </div>
            </div>
        </>
    )
}