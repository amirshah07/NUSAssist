import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './pages/Homepage';
import URoadmap from './pages/URoadmap';
import Timetable from './pages/Timetable';
import Profile from './pages/Profile';
import Gpa from './pages/Gpa';
import NoPage from './pages/NoPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Homepage />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/roadmap" element={<URoadmap />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/gpacalculator" element={<Gpa />} />
        <Route path="*" element={<NoPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
