import React, { useRef } from 'react'
import Caramel from '../assets/images/bug1.png'
import Caramel1 from '../assets/images/bug2.png'
import Caramel2 from '../assets/images/bug3.png'
import Caramel3 from '../assets/images/bug3.png'

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const Taste = () => {

  const tasteRef = useRef(null);

  useGSAP(() => {
    
    SplitText.create("h2", {
      type: "chars",
      onSplit(self) {
        gsap.from(self.chars, {
          scale: 1.3,
          opacity: 0,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: tasteRef.current,
            start: 'top bottom',
            end: 'center center',
            scrub: 1,
          }
        })
      }
    });

    gsap.set(".img-1", { visibility: "visible" });
    gsap.set(".img-2", { visibility: "hidden" });
    gsap.set(".img-3", { visibility: "hidden" });
    gsap.set(".img-4", { visibility: "hidden" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: tasteRef.current,
        start: "top top",
        end: "+=600%",
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      },
    });

    // 1️⃣ Smooth (already visible)
    // tl.from(".text-1", { opacity: 0 });
    const split1 = new SplitText(".text-1", { type: "chars" });
    const split2 = new SplitText(".text-2", { type: "chars" });
    const split3 = new SplitText(".text-3", { type: "chars" });
    const split4 = new SplitText(".text-4", { type: "chars" });

    // Arrow animation
    const arrows = gsap.utils.toArray(
      tasteRef.current.querySelectorAll(".arrow-path")
    );

    arrows.forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });
    });

    tl.to(".arrow-1", {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: "power1.inOut",
    });

    tl.to(".arrow-1", {
      fill: "#0D1927",
      duration: 0.2,
    }, "<+=0.4");

    tl.from(split1.chars, {
      visibility: "hidden",
      stagger: {
        each: 0.08,
        ease: "power1.out",
      },
      duration: 0.6,
    }, "<+=0.1");

    // 2️⃣ Crunchy
    tl.to(".img-1", { visibility: "hidden" });
    tl.to(".img-2", { visibility: "visible" }, "<");

    tl.to(".arrow-2", {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: "power1.inOut",
    }, "<+=0.3");

    tl.to(".arrow-2", {
      fill: "#0D1927",
      duration: 0.2,
    }, "<+=0.4");

    tl.from(split2.chars, {
      visibility: "hidden",
      stagger: {
        each: 0.08,
        ease: "power1.out",
      },
      duration: 0.6,
    }, "<+=0.1");

    // 3️⃣ Satisfying
    tl.to(".img-2", { visibility: "hidden" });
    tl.to(".img-3", { visibility: "visible" }, "<");

    tl.to(".arrow-3", {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: "power1.inOut",
    }, "<+=0.3");

    tl.to(".arrow-3", {
      fill: "#0D1927",
      duration: 0.2,
    }, "<+=0.4");

    tl.from(split3.chars, {
      visibility: "hidden",
      stagger: {
        each: 0.08,
        ease: "power1.out",
      },
      duration: 0.6,
    }, "<+=0.1");

    // 4️⃣ Balanced
    tl.to(".img-3", { visibility: "hidden" });
    tl.to(".img-4", { visibility: "visible" }, "<");

    tl.to(".arrow-4", {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: "power1.inOut",
    }, "<+=0.3");

    tl.to(".arrow-4", {
      fill: "#0D1927",
      duration: 0.2,
    }, "<+=0.4");

    tl.from(split4.chars, {
      visibility: "hidden",
      stagger: {
        each: 0.08,
        ease: "power1.out",
      },
      duration: 0.6,
    }, "<+=0.1");
    
  }, {scope: tasteRef})

  return (
    <section ref={tasteRef} className='text-center h-screen pt-8 pb-20'>
      <h2>Feel the Taste</h2>
      <div className='flex justify-center items-center h-full relative'>
        <div className="relative">
          <img src={Caramel} alt="Caramel" className='img-1 h-[650px] w-auto object-contain z-1' />
          {/* Smooth (Right Side) */}
          <div className='absolute top-[40%] -right-[350px] flex items-center gap-6'>
            <svg width="118" height="39" className="-scale-y-100 scale-x-100 rotate-12" viewBox="0 0 118 39" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className="arrow-path arrow-1"
                d="M0.5 11.2
                  C6.6 21 34.5 32.1 54 32.6
                  C75.1 33.3 86.9 29.8 110.3 16
                  C110.1 17.6 109.8 19 109.8 20.2
                  C109.7 21.6 109.6 23.1 109.8 24.4
                  C109.9 24.9 110.6 25.5 111.1 25.5
                  C111.6 25.6 112.4 24.9 112.5 24.5
                  C113.6 20.5 114.5 16.5 115.5 12.3
                  C115.8 11 115.2 10.1 113.8 9.8
                  C108.4 9 102.9 8.2 97.4 7.5
                  C96.1 7.4 94.7 7.8 93.1 8
                  C94.7 11.3 97.6 10.7 99.8 11.3
                  C102.1 12.1 104.6 12.4 107.5 13.1
                  C101.2 18.3 94.6 21.8 87.5 24.3
                  C61.5 33.6 36.5 30.5 12.4 17.9
                  C9.2 16.3 6.3 14.3 3.3 12.5
                  C2.3 12.2 1.5 11.9 0.5 11.2Z"
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="2.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className='taste-text text-1 font-accent font-bold tracking-tight text-[55px]'>Smooth</span>
          </div>
        </div>
        <div className="absolute z-0">
          <img src={Caramel1} alt="Caramel" className='img-2 h-[650px] w-auto object-contain' />
          {/* Crunchy (Top Left) */}
          <div className='absolute top-[10%] -left-[350px] flex items-center gap-6'>
            <span className='taste-text text-2 font-accent font-bold tracking-tight text-[55px]'>Crunchy</span>
            <svg width="118" height="39" className="-scale-x-100 rotate-12" viewBox="0 0 118 39" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className="arrow-path arrow-2"
                d="M0.5 11.2
                  C6.6 21 34.5 32.1 54 32.6
                  C75.1 33.3 86.9 29.8 110.3 16
                  C110.1 17.6 109.8 19 109.8 20.2
                  C109.7 21.6 109.6 23.1 109.8 24.4
                  C109.9 24.9 110.6 25.5 111.1 25.5
                  C111.6 25.6 112.4 24.9 112.5 24.5
                  C113.6 20.5 114.5 16.5 115.5 12.3
                  C115.8 11 115.2 10.1 113.8 9.8
                  C108.4 9 102.9 8.2 97.4 7.5
                  C96.1 7.4 94.7 7.8 93.1 8
                  C94.7 11.3 97.6 10.7 99.8 11.3
                  C102.1 12.1 104.6 12.4 107.5 13.1
                  C101.2 18.3 94.6 21.8 87.5 24.3
                  C61.5 33.6 36.5 30.5 12.4 17.9
                  C9.2 16.3 6.3 14.3 3.3 12.5
                  C2.3 12.2 1.5 11.9 0.5 11.2Z"
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="2.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className="absolute -z-1">
          <img src={Caramel2} alt="Caramel" className='img-3 h-[650px] w-auto object-contain' />
          {/* Satisfying (Bottom Right / Center) */}
          <div className='absolute bottom-[10%] -right-[230px] flex flex-col items-center gap-3'>
            <svg width="113" height="84" className="rotate-[120deg]" viewBox="0 0 113 84" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className="arrow-path arrow-3"
                d="M0 23.5
                  C9.8 17.3 40.1 19.9 57.9 28
                  C77.1 36.7 86.2 45 101.1 67.7
                  C101.7 66.1 102 64.8 102.5 63.7
                  C103.1 62.4 103.6 61 104.4 59.8
                  C104.6 59.5 105.7 59.3 106.1 59.4
                  C106.6 59.6 107 60.6 106.9 61
                  C106.1 65.1 105.2 69.1 104.3 73.2
                  C103.9 74.6 103 75.1 101.6 74.8
                  C96.4 73.1 91.1 71.4 85.8 69.6
                  C84.7 69.2 83.6 68.1 82.2 67.3
                  C85.1 65 87.4 66.9 89.7 67.2
                  C92.1 67.6 94.5 68.3 97.4 69
                  C94 61.6 89.6 55.5 84.4 50.1
                  C65.1 30.4 41.2 22.2 14.1 22.9
                  C10.5 23 7 23.5 3.5 23.7
                  C2.5 23.6 1.6 23.5 0 23.5Z"
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="2.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className='taste-text text-3 font-accent font-bold tracking-tight text-[55px] whitespace-nowrap pl-24'>Satisfying</span>
          </div>
        </div>
        <div className="absolute -z-2">
          <img src={Caramel3} alt="Caramel" className='img-4 h-[650px] w-auto object-contain' />
          {/* Balanced (Middle/Bottom Left) */}
          <div className='absolute top-[60%] -left-[350px] flex items-center gap-6'>
            <span className='taste-text text-4 font-accent font-bold tracking-tight text-[55px]'>Balanced</span>
            <svg width="118" height="39" className="-scale-x-100 -scale-y-100 -rotate-12" viewBox="0 0 118 39" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className="arrow-path arrow-4"
                d="M0.5 11.2
                  C6.6 21 34.5 32.1 54 32.6
                  C75.1 33.3 86.9 29.8 110.3 16
                  C110.1 17.6 109.8 19 109.8 20.2
                  C109.7 21.6 109.6 23.1 109.8 24.4
                  C109.9 24.9 110.6 25.5 111.1 25.5
                  C111.6 25.6 112.4 24.9 112.5 24.5
                  C113.6 20.5 114.5 16.5 115.5 12.3
                  C115.8 11 115.2 10.1 113.8 9.8
                  C108.4 9 102.9 8.2 97.4 7.5
                  C96.1 7.4 94.7 7.8 93.1 8
                  C94.7 11.3 97.6 10.7 99.8 11.3
                  C102.1 12.1 104.6 12.4 107.5 13.1
                  C101.2 18.3 94.6 21.8 87.5 24.3
                  C61.5 33.6 36.5 30.5 12.4 17.9
                  C9.2 16.3 6.3 14.3 3.3 12.5
                  C2.3 12.2 1.5 11.9 0.5 11.2Z"
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="2.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Taste