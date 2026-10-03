import React, { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Video1 from "../assets/video/v1.mp4";
import Video2 from "../assets/video/v2.mp4";
import Video3 from "../assets/video/v3.mp4";

gsap.registerPlugin(ScrollTrigger);

const Quality = () => {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useGSAP(() => {
    // set initial state individually
    cardsRef.current.forEach((card, i) => {
      gsap.set(card, {
        y: "180%",
        rotate: i % 2 === 0 ? -10 : 10, // alternate rotation
      });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "+=300%",
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      },
    });

    tl.to(cardsRef.current, {
      y: 0,
      rotate: 0,
      duration: 2,
      stagger: 1,
      ease: "power2.out",
    });
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="inner-container pt-30 pb-40">
      <div className="grid grid-cols-12 gap-20">
        {/* LEFT CONTENT */}
        <div className="col-span-7 h-full flex flex-col justify-between">
          <h2 className="max-w-175 leading-20">
            What goes into every meal at{" "}
            <span className="text-orange">BLAZE</span>
          </h2>
          <div className="max-w-115 leading-6 font-medium">
            Every dish is a result of careful sourcing, precise timing, and
            countless taste tests — all to make sure each bite feels intentional.
          </div>
        </div>

        {/* RIGHT CARDS */}
        <div className="col-span-5 relative h-130">
          <div
            ref={(el) => (cardsRef.current[0] = el)}
            className="card bg-white border-[6px] border-blue rounded-3xl max-w-115 w-full p-4 min-h-112 flex flex-col ml-auto z-10"
          >
            <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 bg-gray-100 flex-shrink-0">
              <video src={Video1} autoPlay loop muted playsInline className="w-full h-full object-cover"></video>
            </div>
            <div className="flex flex-col justify-between flex-grow text-brown">
              <div>
                <div className="text-[3rem] font-semibold leading-tight text-blue">200+</div>
                <div className="text-2xl font-semibold">Taste Iterations</div>
              </div>
              <div className="font-medium">Refined until the flavour feels just right.</div>
            </div>
          </div>

          <div
            ref={(el) => (cardsRef.current[1] = el)}
            className="card bg-white border-[6px] border-yellow rounded-3xl max-w-115 w-full p-4 min-h-112 flex flex-col absolute top-16 right-0 z-20 shadow-lg"
          >
            <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 bg-gray-100 flex-shrink-0">
              <video src={Video2} autoPlay loop muted playsInline className="w-full h-full object-cover"></video>
            </div>
            <div className="flex flex-col justify-between flex-grow text-brown">
              <div>
                <div className="text-[3rem] font-semibold leading-tight text-yellow">30+</div>
                <div className="text-2xl font-semibold">Test Batches</div>
              </div>
              <div className="font-medium">Small batches. Big attention to detail.</div>
            </div>
          </div>

          <div
            ref={(el) => (cardsRef.current[2] = el)}
            className="card bg-white border-[6px] border-green rounded-3xl max-w-115 w-full p-4 min-h-112 flex flex-col absolute top-32 right-0 z-30 shadow-lg"
          >
            <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 bg-gray-100 flex-shrink-0">
              <video src={Video3} autoPlay loop muted playsInline className="w-full h-full object-cover"></video>
            </div>
            <div className="flex flex-col justify-between flex-grow text-brown">
              <div>
                <div className="text-[3rem] font-semibold leading-tight text-green">100%</div>
                <div className="text-2xl font-semibold">Natural Ingredients</div>
              </div>
              <div className="font-medium">No shortcuts. No compromises.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Quality;
