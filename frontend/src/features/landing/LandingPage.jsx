import HeroSection from './HeroSection';
import HowItWorks from './HowItWorks';
import FeatureShowcase from './FeatureShowcase';
import FooterSection from './FooterSection';
import ParallaxSection from './ParallaxSection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ParallaxSection offset={40}>
        <HowItWorks />
      </ParallaxSection>
      <ParallaxSection offset={30}>
        <FeatureShowcase />
      </ParallaxSection>
      <FooterSection />
    </>
  );
}
