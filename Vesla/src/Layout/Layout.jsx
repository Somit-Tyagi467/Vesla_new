import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar.jsx";

export default function Layout() {
  return (
    <div>
      <Navbar />
      <div className=""> 
        {/* This spacing pushes content below your fixed navbar */}
        <Outlet />
      </div>
    </div>
  );
}
