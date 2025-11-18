import React from "react";
import { ArrowRight } from "lucide-react";

const Card = ({ heading, subtitle, image, icon, align = "left",width }) => {
  const alignmentClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end"
  };

  return (
    <div className={`py-5 px-6 bg-[#0a1118] rounded-lg shadow-lg 
      flex flex-col  gap-6 
       ${alignmentClasses[align]}`}
       style={{ width: width ? width : "26rem" }} 
    >

        <div className="image rounded-4xl
          mx-auto bg-[radial-gradient(circle,#6d28d9_0%,#0000_70%)]
          backdrop-blur-2xl opacity-80 
          w-full max-w-full h-auto
          flex justify-center items-center">
          {image ? <img src={image} alt={heading} className="w-full h-auto object-cover"/> : icon}
        </div>

        <div className="text">

          <h1 className="mb-4  text-2xl font-bold">
            {heading}
          </h1>

          <p className="text-lg">
            {subtitle}
          </p>

        </div>

    </div>
  );
};

export default Card;
