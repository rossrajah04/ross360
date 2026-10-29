
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import VirtualTours from './pages/VirtualTours.jsx';
import GoogleStreetView from './pages/GoogleStreetView.jsx';
import Businesses from './pages/Businesses.jsx';
import Property from './pages/Property.jsx';
import Portfolio from './pages/Portfolio.jsx';
import Pricing from './pages/Pricing.jsx';
import About from './pages/About.jsx';
import Quote from './pages/Quote.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Guides from './pages/Guides.jsx';
import Guide from './pages/Guide.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="virtual-tours" element={<VirtualTours />} />
        <Route path="google-street-view" element={<GoogleStreetView />} />
        <Route path="businesses" element={<Businesses />} />
        <Route path="property" element={<Property />} />
        <Route path="portfolio" element={<Portfolio />} />

        {/* Old category pages redirect to the portfolio. */}
        <Route
          path="portfolio/businesses"
          element={<Navigate to="/portfolio" replace />}
        />
        <Route
          path="portfolio/properties"
          element={<Navigate to="/portfolio" replace />}
        />

        <Route path="guides" element={<Guides />} />
        <Route path="guides/:slug" element={<Guide />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="about" element={<About />} />
        <Route path="get-a-quote" element={<Quote />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
