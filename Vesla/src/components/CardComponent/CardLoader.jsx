import React from "react";
import Card from "./CardComponent";
import { cardConfig } from "../../config/cardConfig";

const CardLoader = ({ page }) => {
  const cards = cardConfig[page]?.cards;
  const type = cardConfig[page]?.type;

  if (!cards)
    return <p className="text-gray-400">No cards found for "{page}".</p>;

  return (
    <div className={`w-[95%] flex  gap-6 ${type === 'row' ? 'flex-row' : 'flex-col'}`}>
      {cards.map((item, i) => (
        <Card
          key={i}
          heading={item.heading}
          subtitle={item.subtitle}
          image={item.image}
          icon={item.icon}
          align={item.align}
          width={item.width}
          video={item.video}
          svg={item.svg}
        />
      ))}
    </div>
  );
};

export default CardLoader;
