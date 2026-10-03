import Seo from '../components/Seo.jsx';
import useReveal from '../lib/useReveal.js';
import {
  Opening,
  StepInside,
  Understanding,
  Compare,
  Experience,
  SpaceTypes,
  Process,
  Fees,
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
      <Understanding />
      <Compare />
      <Experience />
      <SpaceTypes />
      <Process />
      <Fees />
      <Closing />
    </div>
  );
}
