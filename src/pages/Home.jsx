import Seo from '../components/Seo.jsx';
import useReveal from '../lib/useReveal.js';
import {
  Opening,
  StepInside,
  Explore,
  Create,
  Process,
  Fees,
  About,
  Closing,
} from '../components/home/HomeSections.jsx';
import '../styles/home.css';

export default function Home() {
  useReveal();
  return (
    <div className="home">
      <Seo page="home" />
      <Opening />
      <StepInside />
      <Explore />
      <Create />
      <Process />
      <Fees />
      <About />
      <Closing />
    </div>
  );
}
