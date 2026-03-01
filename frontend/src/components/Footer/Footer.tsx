import './Footer.css'

export default function Footer() {
    return (
        <footer className="app-footer">
            <div className="footer-content">
                <p>© {new Date().getFullYear()} NUSAssist | <a href="mailto:nusassist.contact@gmail.com">nusassist.contact@gmail.com</a></p>
            </div>
        </footer>
    );
}