                
                
const Heading = ({ heading, subtitle, highlight ,size="md" }) => {
    const sizes = {
    sm: "text-3xl sm:text-4xl",
    md: "text-4xl sm:text-5xl",
    lg: "text-5xl sm:text-6xl lg:text-7xl",
    xl: "text-6xl sm:text-7xl lg:text-8xl",
  };
    return (                
                <div className="heading mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-5 sm:px-8">

                    <h1 className={`${sizes[size]} 
                     flex flex-col font-medium mb-4 text-center`}>

                        {heading} <span className='bg-linear-to-b from-white via-blue-300 to-blue-600 bg-clip-text text-transparent'>{highlight}</span>
                    </h1>
                    
                    <p className='mx-auto mt-4 w-full max-w-2xl text-center text-base leading-7 text-gray-400 sm:mt-6 sm:text-lg'>
                        {subtitle}
                    </p>
                </div>
    );
};

export default Heading;
