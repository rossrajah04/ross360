import Seo from '../components/Seo.jsx';
import useReveal from '../lib/useReveal.js';
import {
  Opening,
  StepInside,
  WhatWeCreate,
  HowItWorks,
  Pricing,
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
      <WhatWeCreate />
      <HowItWorks />
      <Pricing />
      <About />
      <Closing />
    </div>
  );
}
