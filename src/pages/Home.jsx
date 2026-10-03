import Seo from '../components/Seo.jsx';
import CtaBand from '../components/CtaBand.jsx';
import {
  Hero,
  ExploreTour,
  WhatWeDo,
  WhyThreeSixty,
  WhoItsFor,
  WhatYouReceive,
  HowItWorks,
  PricingPreview,
  PortfolioSection,
  WebsiteAndGoogle,
  FaqSection,
} from '../components/home/HomeSections.jsx';

export default function Home() {
  return (
    <>
      <Seo page="home" />
      <Hero />
      <ExploreTour />
      <WhatWeDo />
      <WhyThreeSixty />
      <WhoItsFor />
      <WhatYouReceive />
      <HowItWorks />
      <PricingPreview />
      <PortfolioSection />
      <WebsiteAndGoogle />
      <FaqSection />
      <CtaBand />
    </>
  );
}
