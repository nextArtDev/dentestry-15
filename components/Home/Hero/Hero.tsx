'use client'
import { motion } from 'framer-motion'
import HeroImage from '../../../public/images/doctor.png'
import tooth from '../../../public/images/tooth.png'
import HeroBG from '../../../public/images/herobg.png'
import Image from 'next/image'
import Orbiting from './Orbitting'
import Works from './works'

const textVariants = {
  initial: {
    x: -500,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 1,
      staggerChildren: 0.1,
    },
  },
  scrollButton: {
    opacity: 0,
    y: 10,
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
}

const Hero = () => {
  return (
    <div
      className="w-full overflow-x-hidden hero relative bg-opacity-35 "
      style={{
        // height: 'calc(100vh - 100px)',
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        // background: 'linear-gradient(180deg, #FC898B, #F39C9D)',
      }}
    >
      <Image fill src={HeroBG} alt="hero" className="object-cover -z-[1] " />
      <section className="  grid grid-cols-1 grid-rows-9 md::grid-cols-2  w-full h-full mx-auto max-w-screen-xl  ">
        <article className="text-center row-span-2 flex flex-col pt-16 items-center justify-center w-full h-full  ">
          <motion.div
            className="textContainer space-y-4"
            variants={textVariants}
            initial="initial"
            animate="animate"
          >
            <motion.h2
              style={{
                // fontSize: '30px',
                color: 'rebeccapurple',
                // letterSpacing: '10px',
              }}
              className="text-3xl font-bold pt-8"
              variants={textVariants}
            >
              دکتر کتایون کلانترمعتمدی
            </motion.h2>
            <motion.h1
              variants={textVariants}
              className="text-xl font-semibold text-[rebeccapurple]/70"
            >
              جراح و دندانپزشک
            </motion.h1>
          </motion.div>
        </article>
        <article className="relative  row-span-7">
          <figure className="relative flex flex-col w-full h-full">
            <Image
              fill
              src={HeroImage.src}
              alt=""
              className="z-[1]  object-contain w-fit px-10"
              // sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <Orbiting />
          </figure>
          <Image
            width={52}
            height={50}
            src={tooth.src}
            alt=""
            className="z-[3] absolute top-[12vh] right-[5%]    md:right-[20%] md:top-0 lg:right-[30%] lg:top-0     object-contain py-8 animate-bounce"
          />

          <Works />
        </article>
      </section>
    </div>
  )
}

export default Hero
