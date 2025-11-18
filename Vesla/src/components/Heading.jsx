                
                
const Heading = ({ heading, subtitle, highlight ,size="5xl" }) => {
    return (                
                <div className="heading m-auto flex flex-col justify-center items-center">

                    <h1 className={`text-7xl text-${size} 
                     flex flex-col font-medium mb-4 text-center`}>

                        {heading} <span className='bg-linear-to-b from-white via-blue-300 to-blue-600 bg-clip-text text-transparent'>{highlight}</span>
                    </h1>
                    
                    <p className='text-lg w-[60%] mx-12 mt-6 text-gray-400 text-center max-w-2xl'>
                        {subtitle}
                    </p>
                </div>
    );
};

export default Heading;