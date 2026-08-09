import React from 'react';

export function Logo({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinejoin="miter" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradBlueV17" gradientUnits="userSpaceOnUse" x1="50" y1="60" x2="50" y2="5">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient id="gradRedV17" gradientUnits="userSpaceOnUse" x1="50" y1="40" x2="50" y2="95">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
        
        <filter id="rounded3dSoftV17" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur" />
          <feDiffuseLighting in="blur" surfaceScale="6" diffuseConstant="1.2" lightingColor="white" result="diffuse">
            <fePointLight x="0" y="0" z="50" />
          </feDiffuseLighting>
          <feComposite in="diffuse" in2="SourceAlpha" operator="in" result="diffuseMasked" />
          <feComposite in="diffuseMasked" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="base3d" />
          <feSpecularLighting in="blur" surfaceScale="6" specularConstant="0.4" specularExponent="15" lightingColor="#e2e8f0" result="specular">
            <fePointLight x="20" y="20" z="40" />
          </feSpecularLighting>
          <feComposite in="specular" in2="SourceAlpha" operator="in" result="specularMasked" />
          <feComposite in="specularMasked" in2="base3d" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="finalRounded" />
        </filter>
      </defs>
      <g className="drop-shadow-[0_10px_20px_rgba(59,130,246,0.7)]">
        <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="url(#gradBlueV17)" filter="url(#rounded3dSoftV17)" />
      </g>
      <g className="drop-shadow-[0_10px_20px_rgba(249,115,22,0.7)]">
        <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="url(#gradRedV17)" filter="url(#rounded3dSoftV17)" />
      </g>
    </svg>
  );
}
