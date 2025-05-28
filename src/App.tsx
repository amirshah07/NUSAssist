import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './pages/Homepage/Homepage';
import RoadmapPage from './pages/RoadmapPage/RoadmapPage';
import TimetablePage from './pages/TimetablePage/TimetablePage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import GpaPage from './pages/GpaPage/GpaPage';
import Login from './pages/Login and Register/Login';
import Register from './pages/Login and Register/Register';
import PageNotFound from './pages/PageNotFound/PageNotFound';




function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Homepage />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/gpacalculator" element={<GpaPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
