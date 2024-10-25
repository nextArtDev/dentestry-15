import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/all'
gsap.registerPlugin(ScrollTrigger)
import { useEffect, useRef, useState } from 'react'

// import { pauseImg, playImg, replayImg } from '../lib/utils'
import ReplayImg from '../../public/images/replay.svg'
import PlayImg from '../../public/images/play.svg'
import PauseImg from '../../public/images/pause.svg'
import Image from 'next/image'
import { hightlightsSlides } from '@/constants'

//claude-3-haiku-20240307
interface VideoProps {
  isEnd: boolean
  startPlay: boolean
  videoId: number
  isLastVideo: boolean
  isPlaying: boolean
}

// interface VideoSlideProps {
//   id: number
//   video: string
//   videoDuration: number
//   textLists: string[]
// }

const VideoCarousel = () => {
  const videoRef = useRef<(HTMLVideoElement | null)[]>(
    Array(hightlightsSlides.length).fill(null)
  )
  const videoSpanRef = useRef<(HTMLSpanElement | null)[]>(
    Array(hightlightsSlides.length).fill(null)
  )

  const videoDivRef = useRef<(HTMLDivElement | null)[]>(
    Array(hightlightsSlides.length).fill(null)
  )
  // useEffect(() => {
  //   if (hightlightsSlides) {
  //     videoRef.current = Array.from(
  //       { length: hightlightsSlides.length },
  //       () => null
  //     )

  //     videoSpanRef.current = Array(hightlightsSlides.length).fill(null)

  //     videoDivRef.current = Array(hightlightsSlides.length).fill(null)
  //   }
  // }, [hightlightsSlides])
  // video and indicator
  const [video, setVideo] = useState<VideoProps>({
    isEnd: false,
    startPlay: false,
    videoId: 0,
    isLastVideo: false,
    isPlaying: false,
  })

  const [loadedData, setLoadedData] = useState<unknown[]>([])
  const { isEnd, isLastVideo, startPlay, videoId, isPlaying } = video

  useGSAP(() => {
    // slider animation to move the video out of the screen and bring the next video in
    gsap.to('#slider', {
      transform: `translateX(${-100 * videoId}%)`,
      duration: 2,
      ease: 'power2.inOut', // show visualizer https://gsap.com/docs/v3/Eases
    })

    // video animation to play the video when it is in the view
    gsap.to('#video', {
      scrollTrigger: {
        trigger: '#video',
        toggleActions: 'restart none none none',
      },
      onComplete: () => {
        setVideo((pre) => ({
          ...pre,
          startPlay: true,
          isPlaying: true,
        }))
      },
    })
  }, [isEnd, videoId])

  useEffect(() => {
    let currentProgress = 0
    const span: (HTMLSpanElement | null)[] = videoSpanRef.current!

    if (span[videoId]) {
      // animation to move the indicator
      const anim: TweenLite = gsap.to(span[videoId], {
        onUpdate: () => {
          // get the progress of the video
          const progress = Math.ceil(anim.progress() * 100)

          if (progress != currentProgress) {
            currentProgress = progress

            // set the width of the progress bar
            gsap.to(videoDivRef.current[videoId], {
              width:
                window.innerWidth < 760
                  ? '10vw' // mobile
                  : window.innerWidth < 1200
                  ? '10vw' // tablet
                  : '4vw', // laptop
            })

            // set the background color of the progress bar
            gsap.to(span[videoId], {
              width: `${currentProgress}%`,
              backgroundColor: 'white',
            })
          }
        },

        // when the video is ended, replace the progress bar with the indicator and change the background color
        onComplete: () => {
          if (isPlaying) {
            gsap.to(videoDivRef.current[videoId], {
              width: '12px',
            })
            gsap.to(span[videoId], {
              backgroundColor: '#afafaf',
            })
          }
        },
      })

      if (videoId == 0) {
        anim.restart()
      }

      // update the progress bar
      const animUpdate = () => {
        anim.progress(
          videoRef.current[videoId]!.currentTime /
            hightlightsSlides[videoId].videoDuration!
        )
      }

      if (isPlaying) {
        // ticker to update the progress bar
        gsap.ticker.add(animUpdate)
      } else {
        // remove the ticker when the video is paused (progress bar is stopped)
        gsap.ticker.remove(animUpdate)
      }
    }
  }, [videoId, startPlay, isPlaying])

  useEffect(() => {
    if (loadedData.length > 3) {
      if (!isPlaying) {
        videoRef.current[videoId]?.pause()
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        startPlay && videoRef.current[videoId]?.play()
      }
    }
  }, [startPlay, videoId, isPlaying, loadedData])

  useEffect(() => {
    if (startPlay && videoRef.current[videoId]) {
      videoRef.current[videoId]?.play()
    }
  }, [startPlay, videoId])

  // vd id is the id for every video until id becomes number 3
  const handleProcess = (type: string, i?: number) => {
    switch (type) {
      case 'video-end':
        setVideo((pre) => ({ ...pre, isEnd: true, videoId: i! + 1 }))
        break

      case 'video-last':
        setVideo((pre) => ({ ...pre, isLastVideo: true }))
        break

      case 'video-reset':
        setVideo((pre) => ({ ...pre, videoId: 0, isLastVideo: false }))
        break

      case 'pause':
        setVideo((pre) => ({ ...pre, isPlaying: !pre.isPlaying }))
        break

      case 'play':
        setVideo((pre) => ({ ...pre, isPlaying: !pre.isPlaying }))
        break

      default:
        return video
    }
  }

  // const handleLoadedMetaData = (i, e) => setLoadedData((pre) => [...pre, e])
  const handleLoadedMetaData = (
    i: number,
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    setLoadedData((pre) => [...pre, e.currentTarget])
  }

  return (
    <article className="pb-8">
      <div className="flex items-center">
        {hightlightsSlides.map((list, i) => (
          <div key={list.id} id="slider" className="sm:pr-20 pr-6">
            <div className="video-carousel_container">
              <div className="w-full flex-center rounded-2xl overflow-hidden !h-auto bg-gray-500/70 ml-4   ">
                <video
                  id="video"
                  playsInline={true}
                  className={`${
                    // list.id === 2 && 'translate-x-44'
                    list.id === 2 && 'translate-x-0'
                  }  pointer-events-none`}
                  preload="auto"
                  muted
                  ref={(el) => {
                    if (el) {
                      videoRef.current[i] = el
                    }
                  }}
                  onEnded={() =>
                    i !== 3
                      ? handleProcess('video-end', i)
                      : handleProcess('video-last')
                  }
                  onPlay={() =>
                    setVideo((pre) => ({ ...pre, isPlaying: true }))
                  }
                  onLoadedMetadata={(e) => handleLoadedMetaData(i, e)}
                >
                  <source src={list.video} type="video/mp4" />
                </video>
              </div>

              <div className="absolute top-12 left-[5%] z-10">
                {list.textLists.map((text, i) => (
                  <p key={i} className="md:text-2xl text-xl font-medium">
                    {text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex-center  md:mt-10">
        <div className="flex-center py-5 md:py-6 px-7 bg-gray-400 glass backdrop-blur rounded-full">
          {videoRef.current.map((_, i) => (
            <div
              key={i}
              className="overflow-hidden mx-2 w-3 h-3 bg-gray-500 rounded-full relative cursor-pointer"
              ref={(el) => {
                if (el) {
                  videoDivRef.current[i] = el
                }
              }}
            >
              <span
                className="absolute h-full w-full rounded-full"
                ref={(el) => {
                  if (el) {
                    videoSpanRef.current[i] = el
                  }
                }}
              />
            </div>
          ))}
        </div>

        <button className="relative bg-gray-500 glass control-btn">
          <Image
            className="fill "
            src={isLastVideo ? ReplayImg : !isPlaying ? PlayImg : PauseImg}
            alt={isLastVideo ? 'replay' : !isPlaying ? 'play' : 'pause'}
            onClick={
              isLastVideo
                ? () => handleProcess('video-reset')
                : !isPlaying
                ? () => handleProcess('play')
                : () => handleProcess('pause')
            }
          />
        </button>
      </div>
    </article>
  )
}

export default VideoCarousel
