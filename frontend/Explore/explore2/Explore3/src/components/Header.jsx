import React from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const Header = () => {

  useGSAP(() => {

    gsap.from('header', {
      y: '-25%',
      opacity: 0
    })

  })

  return (
    <>
      <header className='absolute w-full top-0 left-0 right-0 z-[100] pointer-events-none'>
        <div className='flex items-center justify-between max-w-7xl m-auto p-6'>
          <div className="flex items-center justify-start pointer-events-auto">
            <h1 className='text-3xl font-bold font-accent tracking-tighter text-brown drop-shadow-sm'>Blaze Kitchen</h1>
          </div>
          <a href="index.html" className='flex items-center justify-center bg-white rounded-xl text-nowrap px-4 py-3 font-medium gap-3 pointer-events-auto shadow-md'>Explore Kitchen 
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="16" transform="matrix(-1 0 0 1 32 0)" fill="#FF6B57"/>
              <path d="M23 16H9M23 16L17 22M23 16L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </header>

      {/* Go to top button */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className='fixed bottom-10 right-10 z-50 bg-[#FF6B57] text-white p-4 rounded-full shadow-lg hover:bg-[#571F01] transition-colors cursor-pointer group'
        aria-label="Go to top"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform group-hover:-translate-y-1 transition-transform">
          <path d="M12 4L4 12H9V20H15V12H20L12 4Z" fill="currentColor"/>
        </svg>
      </button>
    </>
  )
}

export default Header