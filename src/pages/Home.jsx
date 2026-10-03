import Seo from '../components/Seo.jsx';
import CtaBand from '../components/CtaBand.jsx';
import ExampleTourSection from '../components/ExampleTourSection.jsx';
import {
  Hero,
  WhatWeProvide,
  Applications,
  SelectedWork,
  HowItWorks,
  PricingPreview,
  AboutPreview,
} from '../components/home/HomeSections.jsx';

export default function Home() {
  return (
    <>
      <Seo page="home" />
      <Hero />
      <ExampleTourSection />
      <WhatWeProvide />
      <Applications />
      <SelectedWork />
      <HowItWorks />
      <PricingPreview />
      <AboutPreview />
      <CtaBand />
    </>
  );
}
