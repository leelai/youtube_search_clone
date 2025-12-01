import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './routes/HomePage';
import { SearchPage } from './routes/SearchPage';
import { WorldDetailPage } from './routes/WorldDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/worlds/:id" element={<WorldDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
