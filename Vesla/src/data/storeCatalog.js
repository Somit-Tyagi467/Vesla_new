export const deviceTypes = [
  {
    id: "vesla-starter",
    name: "Vesla Starter",
    price: 2499,
    tagline: "A clear first look at your water readings.",
    features: ["ESP32 monitor", "Temperature sensor", "TDS sensor", "Live dashboard access"],
  },
  {
    id: "vesla-home",
    name: "Vesla Home",
    price: 3999,
    tagline: "A flexible setup for everyday home monitoring.",
    features: ["ESP32 monitor", "Temperature sensor", "TDS sensor", "Turbidity sensor", "Live dashboard access"],
  },
  {
    id: "vesla-pro",
    name: "Vesla Pro",
    price: 5999,
    tagline: "More sensor inputs for a broader monitoring setup.",
    features: ["ESP32 monitor", "Temperature sensor", "TDS sensor", "Turbidity sensor", "Expanded sensor connections"],
  },
];

export const sensorAddOns = [
  { id: "ph", name: "pH sensor kit", price: 899, description: "Add pH readings to your setup." },
  { id: "pressure", name: "Pressure sensor", price: 699, description: "Track pressure at a compatible pipe location." },
  { id: "flow", name: "Water flow sensor", price: 599, description: "Add flow-rate and usage readings." },
  { id: "tds", name: "Replacement TDS probe", price: 399, description: "A spare probe for your TDS module." },
  { id: "turbidity", name: "Replacement turbidity probe", price: 499, description: "A spare probe for your turbidity module." },
];

export const currency = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(amount);

export function getCartLinePrice(line) {
  const device = deviceTypes.find((item) => item.id === line.productId);
  if (!device) return 0;
  return device.price + (line.addOnIds || []).reduce((total, id) => {
    return total + (sensorAddOns.find((item) => item.id === id)?.price || 0);
  }, 0);
}

export function getCartLineName(line) {
  const device = deviceTypes.find((item) => item.id === line.productId);
  return device?.name || "Vesla device";
}
