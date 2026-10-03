import React from 'react'
import Caramel from '../assets/images/grill.png'
import Cocoa from '../assets/images/drink.png'
import Orange from '../assets/images/desert.png'
import Almond from '../assets/images/roll.png'
import Stamp from '../assets/images/stamp.png'

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const HeroChocolates = ({ activeFlavor }) => {

  useGSAP(() => { 

    gsap.from('.caremel-choco', {
      y: "60%",
      scale: 0.8,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from('.cocoa-choco', {
      y: "40%",
      scale: 0.8,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from('.orange-choco', {
      y: "40%",
      scale: 0.8,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from('.almond-choco', {
      y: "60%",
      scale: 0.8,
      duration: 1,
      ease: "power3.out",
    });

    // Stamp
    gsap.from('.stamp', {
      scale: 2,
      opacity: 0,
      duration: 0.4,
      delay: 1,
      ease: "power3.out",
    });

    // Heading
    SplitText.create("h1", {
      type: "chars",
      onSplit(self) {
        gsap.from(self.chars, {
          scale: 1.3,
          opacity: 0,
          stagger: 0.08,
          ease: "power3.out",
        })
      }
    });

    gsap.from('h2', {
      opacity: 0,
      duration: 0.8,
      delay: 0.4,
    });
    
  })

  return (
    <>
      <div className="text-center text-brown pt-20 pb-24">
        <h1 className='text-8xl font-bold leading-28'>Four <span className='text-orange'>Signatures.</span></h1>  
        <h2 className='font-medium text-[40px]'>One Perfect Bite.</h2>
      </div>
      <div className="flex justify-center items-start gap-6">
        <div>
          <img src={Caramel} alt="Caramel" className='relative z-10 caremel-choco h-96 w-auto object-contain mt-18 drop-shadow-[0_10px_40px_rgba(255,107,87,0.5)]' />
        </div>
        <div>
          <img src={Cocoa} alt="Cocoa" className='relative z-10 cocoa-choco h-96 w-auto object-contain drop-shadow-[0_10px_40px_rgba(72,156,211,0.5)]' />
        </div>
        <div>
          <img src={Orange} alt="Orange" className='relative z-10 orange-choco h-96 w-auto object-contain drop-shadow-[0_10px_40px_rgba(253,211,38,0.5)]' />
        </div>
        <div className='relative'>
          <img src={Almond} alt="Almond" className='relative z-10 almond-choco h-96 w-auto object-contain mt-18 drop-shadow-[0_10px_40px_rgba(157,156,61,0.5)]' />
          <img src={Stamp} alt="Stamp" className='stamp absolute z-10 max-w-37.5 -top-10 -left-20 transform rotate-32' />
        </div>
      </div>
    </>
  )
}

export default HeroChocolates