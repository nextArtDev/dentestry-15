import CompareSlides from '@/components/Home/CompareSlides'
import Footer from '@/components/Home/footer/Footer'
import Hero from '@/components/Home/Hero/Hero'
import Rotating from '@/components/Home/Hero/Rotaing'
import Highlights from '@/components/Home/Highlights'
import { ImageCarousel } from '@/components/Home/image-carousel/image-carousel'
import { MarqueeDemoVertical } from '@/components/Home/marquee/MarqueeVertical'
import StickyScrollVideo from '@/components/Home/StickyScrollVideo'
import HorizontalScrollCarousel from '@/components/Home/HorizontalScroll'

export default function Home() {
  return (
    <section className="relative max-w-screen   h-full min-h-screen ">
      <section className="overflow-x-hidden">
        <Hero />
      </section>
      <section className="relative bg-white ">
        <HorizontalScrollCarousel rtl className="overflow-x-hidden " />
      </section>

      <section className="relative min-h-[70vh] overflow-hidden flex items-center justify-center ">
        <Rotating />
      </section>
      <Highlights />
      <section dir="ltr" className="relative  ">
        <ImageCarousel />
      </section>
      <StickyScrollVideo />
      <CompareSlides />
      <section className="flex gap-2">
        <MarqueeDemoVertical />
      </section>
      <Footer />
    </section>
  )
}
