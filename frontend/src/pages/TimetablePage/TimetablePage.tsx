import Navbar from "../../components/Navbar/Navbar";
import Timetable from "../../components/Timetable/Timetable";
import Footer from "../../components/Footer/Footer";
import "./TimetablePage.css";

export default function TimetablePage() {
    return (
        <div className="timetable-page">
            <Navbar />
            <Timetable />
            <Footer/>
        </div>
    );
}