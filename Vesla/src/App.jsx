import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import CardLoader from './components/CardComponent/CardLoader.jsx'
import GradientButton from "./components/Button/GradientButton.jsx";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import Pricing from "./pages/pricing.jsx";
import Layout from './Layout/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
function App() {

  return (
    <>
      <div className="min-h-screen bg-black text-white">
      <Routes>
        <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<Pricing />} />
         <Route path="/dashboard" element={<DashboardPage />} />
        {/*<Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} /> */}
        </Route>
      </Routes>
    </div>

    </>
  )
}

export default App
