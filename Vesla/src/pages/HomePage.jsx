import React from 'react';
import CardLoader from '../components/CardComponent/CardLoader.jsx';
import Heading from '../components/Heading.jsx';
import GradientButton from '../components/Button/GradientButton.jsx';
import bgImg from '../assets/bg.png';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
const HomePage = () => { 
    const bgRef = useRef(null);

    useEffect(() => {
        const section = bgRef.current;

        const handleMouseMove = (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;  // adjust intensity
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        gsap.to(section, {
        backgroundPosition: `${50 + x}% ${50 + y}%`,
        duration: 1.2,
        ease: "power3.out",
        });
        

        };

        section.addEventListener("mousemove", handleMouseMove);

        return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <>  
            <section ref={bgRef} 
            className='flex min-h-[100svh] flex-col items-center justify-center px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32'
            style={{
                backgroundImage: `url(${bgImg})`,
            }}>

                <Heading heading="Welcome to Vesla" highlight="Water monitoring made clear" subtitle="Follow water sensor readings over time, spot changes, and see the latest measurements together in one dashboard."  size="lg" />

                <div className='py-8 sm:py-10'>
                    <GradientButton text="Get started" to="/shop" variant="secondary" />
                </div>

            </section>

            <section className='pt-20 flex flex-col justify-center items-center min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(29,185,255,0.15),rgba(0,0,0,1))] '>

                <Heading heading="Welcome to Vesla" highlight="Understand your water readings" subtitle="Vesla connects sensor measurements with a clear history of how water conditions change." size="md"/>

                <div className="Container mt-12 flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 sm:mt-20 sm:px-6">
                    <CardLoader page="innovation" />
                    
                    <CardLoader page="ethics" />
                </div>
                <div className='pt-8'>
                    <GradientButton text="Get started" to="/shop" variant="secondary" />
                </div>
            </section>
            <section className='bg-[radial-gradient(ellipse_at_bottom,rgba(29,185,255,0.22),rgba(0,0,0,1))]'></section>
            <section></section>
            <section></section>
            <section></section>
        </>
    );
}

export default HomePage;
