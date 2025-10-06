'use client'

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from 'react'
import { motion, useScroll, useTransform, Variants } from 'framer-motion'
import {
  ReactCompareSlider,
  ReactCompareSliderHandle,
} from 'react-compare-slider'

const cn = (...classes: (string | undefined)[]) =>
  classes.filter(Boolean).join(' ')

interface CombinedMediaCompareProps {
  firstText: string
  secondText: string
  beforeImage: string
  afterImage: string
  disease: string
  index?: number
  disableHandle?: boolean
  as?: any
  className?: string
  leftTextClassName?: string
  rightTextClassName?: string
  mediaContainerClassName?: string
  compareClassName?: string
  scrollOffset?: [string, string]
  scrollRange?: [number, number]
}

export type CombinedMediaCompareRef = {
  animate: () => void
  reset: () => void
}

export const CombinedMediaCompare = forwardRef<
  CombinedMediaCompareRef,
  CombinedMediaCompareProps
>(
  (
    {
      firstText,
      secondText,
      beforeImage,
      afterImage,
      disease,
      index = 1,
      disableHandle = false,
      as = 'p',
      className,
      leftTextClassName,
      rightTextClassName,
      mediaContainerClassName,
      compareClassName,
      scrollOffset = ['start end', 'end start'],
      scrollRange = [0.3, 0.7],
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [sliderPosition, setSliderPosition] = useState(index === 1 ? 0 : 100)
    const [mediaWidth, setMediaWidth] = useState(0)

    const { scrollYProgress } = useScroll({
      target: containerRef,
      offset: scrollOffset,
    })

    const isReversed = index % 2 !== 0

    // Slider position based on scroll
    const position = useTransform(
      scrollYProgress,
      scrollRange,
      isReversed ? [100, 0] : [0, 100]
    )

    // Media width based on scroll (0 to auto/100%)
    const widthProgress = useTransform(scrollYProgress, scrollRange, [0, 100])

    useEffect(() => {
      const unsubscribe = position.onChange((v) => setSliderPosition(v))
      return () => unsubscribe()
    }, [position])

    useEffect(() => {
      const unsubscribe = widthProgress.onChange((v) => setMediaWidth(v))
      return () => unsubscribe()
    }, [widthProgress])

    useImperativeHandle(ref, () => ({
      animate: () => {},
      reset: () => {},
    }))

    const TextComponent = motion.create(as)

    return (
      <div className={cn('flex items-center', className)} ref={containerRef}>
        <TextComponent layout className={leftTextClassName}>
          {firstText}
        </TextComponent>

        <motion.div
          className={cn('overflow-hidden', mediaContainerClassName)}
          style={{
            width: `${mediaWidth}%`,
            opacity: mediaWidth > 0 ? 1 : 0,
          }}
        >
          <div
            dir="ltr"
            className={cn(
              'relative w-full h-full shadow-2xl rounded-lg overflow-hidden',
              compareClassName
            )}
          >
            <ReactCompareSlider
              position={sliderPosition}
              onPositionChange={setSliderPosition}
              itemOne={
                <div className="relative w-full h-full">
                  <img
                    src={beforeImage}
                    alt="Before"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded">
                    پیش از {disease}
                  </div>
                </div>
              }
              itemTwo={
                <div className="relative w-full h-full">
                  <img
                    src={afterImage}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded">
                    پس از {disease}
                  </div>
                </div>
              }
              handle={
                <ReactCompareSliderHandle
                  style={{ color: 'yellow', border: 'none' }}
                  linesStyle={{ opacity: 0 }}
                  buttonStyle={{
                    display: 'none',
                  }}
                />
              }
            />
            {disableHandle && (
              <div className="absolute inset-0 bg-transparent z-[1]"></div>
            )}
          </div>
        </motion.div>

        <TextComponent layout className={rightTextClassName}>
          {secondText}
        </TextComponent>
      </div>
    )
  }
)

CombinedMediaCompare.displayName = 'CombinedMediaCompare'

// Demo Component
export default function CompareBetweenTextDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto space-y-[100vh]">
        <div className="text-center mb-16 h-screen flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Scroll-Based Media Compare
          </h1>
          <p className="text-slate-300 mb-2">
            Scroll up and down to see the animations
          </p>
          <p className="text-slate-400 text-sm">
            Both the compare slider and text width animate with scroll
          </p>
        </div>

        {/* Example 1 - index 1 (even - animates 0 to 100) */}
        <CombinedMediaCompare
          firstText="تبدیل کنید"
          secondText="با درمان ما"
          beforeImage="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop"
          afterImage="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop"
          disease="پوست"
          index={1}
          className="text-4xl font-bold text-white justify-center"
          leftTextClassName="mr-4 whitespace-nowrap"
          rightTextClassName="ml-4 whitespace-nowrap"
          mediaContainerClassName="h-[300px] max-w-[400px]"
          compareClassName="border-4 border-amber-400"
        />

        {/* Example 2 - index 2 (odd - animates 100 to 0) */}
        <CombinedMediaCompare
          firstText="ببینید"
          secondText="تفاوت را"
          beforeImage="https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=600&fit=crop"
          afterImage="https://images.unsplash.com/photo-1559056199-2c7d2df7d6fa?w=800&h=600&fit=crop"
          disease="بازسازی"
          index={2}
          className="text-5xl font-bold text-white justify-center"
          leftTextClassName="mr-6 whitespace-nowrap"
          rightTextClassName="ml-6 whitespace-nowrap"
          mediaContainerClassName="h-[350px] max-w-[500px]"
          compareClassName="border-4 border-blue-400"
        />

        {/* Example 3 - Different scroll range */}
        <CombinedMediaCompare
          firstText="شگفت‌انگیز"
          secondText="نتایج"
          beforeImage="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop"
          afterImage="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800&h=600&fit=crop"
          disease="درمان"
          index={3}
          disableHandle={true}
          scrollRange={[0.2, 0.8]}
          className="text-3xl font-bold text-white justify-end"
          leftTextClassName="mr-4 whitespace-nowrap"
          rightTextClassName="ml-4 whitespace-nowrap"
          mediaContainerClassName="h-[250px] max-w-[350px]"
          compareClassName="border-4 border-green-400"
        />

        <div className="h-screen flex items-center justify-center">
          <p className="text-white text-2xl">
            Scroll back up to see reverse animations
          </p>
        </div>
      </div>
    </div>
  )
}
