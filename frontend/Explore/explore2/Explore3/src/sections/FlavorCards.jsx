import React from 'react'

const FlavorCards = ({ setActiveFlavor }) => {
  return (
    <>
      <div className='grid grid-cols-4 gap-5 items-end pb-30 h-screen'>
        <div className='relative group card caramel-card bg-orange w-full h-[40vh] rounded-xl origin-top     transform transition-transform duration-500 ease-out hover:scale-y-[1.08] flex flex-col items-center justify-end overflow-hidden pb-8'
        onMouseEnter={() => setActiveFlavor('caramel')}
        onMouseLeave={() => setActiveFlavor(null)}>
          <p className="mt-6 text-white text-xl text-center leading-6 opacity-0 
                translate-y-6 group-hover:opacity-100 
                group-hover:translate-y-0
                transition-all duration-500 ease-out">
            Spicy char,<br />juicy bite.
          </p>
        </div>
        <div className='relative group card cocoa-card bg-blue w-full h-[40vh] rounded-xl origin-top     transform transition-transform duration-500 ease-out hover:scale-y-[1.08] flex flex-col items-center justify-end overflow-hidden pb-8' onMouseEnter={() => setActiveFlavor('cocoa')}
        onMouseLeave={() => setActiveFlavor(null)}>
          <p className="mt-6 text-white text-xl text-center leading-6 opacity-0 
                translate-y-6 group-hover:opacity-100 
                group-hover:translate-y-0
                transition-all duration-500 ease-out">
            Refreshing blast<br />with a cool finish.
          </p>
        </div>
        <div className='relative group card orange-card bg-yellow w-full h-[40vh] rounded-xl origin-top     transform transition-transform duration-500 ease-out hover:scale-y-[1.08] flex flex-col items-center justify-end overflow-hidden pb-8' onMouseEnter={() => setActiveFlavor('orange')}
        onMouseLeave={() => setActiveFlavor(null)}>
          <p className="mt-6 text-white text-xl text-center leading-6 opacity-0 
                translate-y-6 group-hover:opacity-100 
                group-hover:translate-y-0
                transition-all duration-500 ease-out">
            Sweet glaze with<br />crispy balance.
          </p>
        </div>
        <div className='relative group card almond-card bg-green w-full h-[40vh] rounded-xl origin-top     transform transition-transform duration-500 ease-out hover:scale-y-[1.08] flex flex-col items-center justify-end overflow-hidden pb-8' onMouseEnter={() => setActiveFlavor('almond')}
        onMouseLeave={() => setActiveFlavor(null)}>
          <p className="mt-6 text-white text-xl text-center leading-6 opacity-0 
                translate-y-6 group-hover:opacity-100 
                group-hover:translate-y-0
                transition-all duration-500 ease-out">
            Savory wrap, <br />perfectly loaded.
          </p>
        </div>
      </div>
    </>
  )
}

export default FlavorCards