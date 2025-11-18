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
            className='flex flex-col justify-center items-center pb-20 pt-72 '
            style={{
                backgroundImage: `url(${bgImg})`,
            }}>

                <Heading heading="Welcome to Vesla" highlight="The Future of Water Monitoring" subtitle="Empowering healthcare with AI-driven solutions for better patient outcomes and operational efficiency." />

                <div className='py-10'>
                    <GradientButton text="Get Started" />
                </div>

            </section>

            <section className='pt-20 flex flex-col justify-center items-center min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(29,185,255,0.15),rgba(0,0,0,1))] '>

                <Heading heading="Welcome to Vesla" highlight="The Future of Water Monitoring" subtitle="Empowering healthcare with AI-driven solutions for better patient outcomes and operational efficiency." size="5xl"/>

                <div className="Container mt-20 flex flex-col gap-8 justify-center items-center min-h-screen w-max max-w-full">
                    <CardLoader page="innovation" />
                    
                    <CardLoader page="ethics" />
                </div>
                <div className='pt-8'>
                    <GradientButton text="Get Started" />
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