import "./Loading.css";

export default function Loading() {
    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <div className="loader"></div>
            </div>
        </div>
    );
}