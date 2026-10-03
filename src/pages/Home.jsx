import Seo from '../components/Seo.jsx';
import CtaBand from '../components/CtaBand.jsx';
import {
  Hero,
  TourExperience,
  WhatWeProvide,
  WhyUse,
  WhoItsFor,
  WhatYouReceive,
  HowItWorks,
  PricingPreview,
  PropertySection,
  PortfolioSection,
  WebsiteAndGoogle,
  FaqSection,
} from '../components/home/HomeSections.jsx';

export default function Home() {
  return (
    <>
      <Seo page="home" />
      <Hero />
      <TourExperience />
      <WhatWeProvide />
      <WhyUse />
      <WhoItsFor />
      <WhatYouReceive />
      <HowItWorks />
      <PricingPreview />
      <PropertySection />
      <PortfolioSection />
      <WebsiteAndGoogle />
      <FaqSection />
      <CtaBand />
    </>
  );
}
