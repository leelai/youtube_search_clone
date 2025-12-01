import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './routes/HomePage';
import { SearchPage } from './routes/SearchPage';
import { WorldDetailPage } from './routes/WorldDetailPage';
import { SearchModesLabPage } from './routes/SearchModesLabPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/worlds/:id" element={<WorldDetailPage />} />
        <Route path="/lab/search-modes" element={<SearchModesLabPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
