import React from "react";

const Card = ({ heading, subtitle, image, icon, video, svg, lottie, align = "left", width }) => {
  const alignmentClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end"
  };

  return (
    <div
      className={`py-5 px-6 bg-[#0a1118] rounded-lg shadow-lg 
      flex flex-col gap-6 
      ${alignmentClasses[align]}`}
      style={{ width: width ? width : "26rem" }}
    >
      {/* MEDIA WRAPPER */}
      <div
        className="
          image rounded-4xl mx-auto 
          bg-[radial-gradient(circle,#6d28d9_0%,#0000_70%)]
          backdrop-blur-2xl opacity-80 
          w-full max-w-full h-auto
          flex justify-center items-center
        "
      >
        {/* Media Rendering Logic  */}
        {svg ? (
          svg
        )  : video ? (
          <video
            src={video}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto object-cover rounded-2xl overflow-hidden"
            style={{ clipPath: "inset(2px 2px 2px 2px)" }}
          />
        ) : image ? (
          <img src={image} alt={heading} className="w-full h-auto object-cover" />
        ) : (
          <div className="text-white text-5xl flex justify-center items-center">
            {icon}
          </div>
        )}
      </div>

      {/* TEXT CONTENT */}
      <div className="text">
        <h1 className="mb-4 text-2xl font-bold">{heading}</h1>
        <p className="text-lg">{subtitle}</p>
      </div>
    </div>
  );
};

export default Card;
