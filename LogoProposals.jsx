import React from 'react';

export default function LogoProposals() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 md:p-16 flex flex-col items-center font-sans">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold tracking-widest uppercase">
            Vectorización SVG
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Reingeniería del Logo</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Tomamos tu boceto original, analizamos su geometría y lo reconstruimos en formato vectorial puro (SVG). Aquí tienes la réplica fiel y dos evoluciones conceptuales.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          

          {/* Propuesta 11 */}
          <div className="bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                {/* Interlock denso. Puntas 23°. Gap X=2 (muy juntos). */}
                <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="#3B82F6" className="drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="#F97316" className="drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V11: Fusión Sólida (23°)</h3>
            <p className="text-slate-400 leading-relaxed">
              La evolución final del interbloqueo. Regresamos las puntas a 23° para mayor solidez y acercamos las dos piezas hasta casi tocarse, maximizando la tensión geométrica del centro sin romper la alineación horizontal.
            </p>
          </div>

          {/* Propuesta 12 */}
          <div className="bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                <defs>
                  <linearGradient id="gradBlueV12" gradientUnits="userSpaceOnUse" x1="50" y1="60" x2="50" y2="5">
                    <stop offset="0%" stopColor="#0F2058" />
                    <stop offset="100%" stopColor="#1E357A" />
                  </linearGradient>
                  <linearGradient id="gradRedV12" gradientUnits="userSpaceOnUse" x1="50" y1="40" x2="50" y2="95">
                    <stop offset="0%" stopColor="#64181C" />
                    <stop offset="100%" stopColor="#862329" />
                  </linearGradient>
                </defs>
                <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="url(#gradBlueV12)" className="drop-shadow-[0_4px_12px_rgba(15,32,88,0.5)]" />
                <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="url(#gradRedV12)" className="drop-shadow-[0_4px_12px_rgba(100,24,28,0.5)]" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V12: Identidad Corporativa</h3>
            <p className="text-slate-400 leading-relaxed">
              Vestimos a la V11 con tus colores definitivos: Azul profundo (#0F2058) y Burdeos (#64181C). Aplicamos un sutil gradiente desde el corazón del interbloqueo hacia las puntas, aportando volumen y un acabado verdaderamente premium.
            </p>
          </div>

          {/* Propuesta 13 */}
          <div className="bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                <defs>
                  <linearGradient id="gradBlueV13" gradientUnits="userSpaceOnUse" x1="50" y1="60" x2="50" y2="5">
                    <stop offset="0%" stopColor="#0F2058" />
                    <stop offset="100%" stopColor="#1E357A" />
                  </linearGradient>
                  <linearGradient id="gradRedV13" gradientUnits="userSpaceOnUse" x1="50" y1="40" x2="50" y2="95">
                    <stop offset="0%" stopColor="#64181C" />
                    <stop offset="100%" stopColor="#862329" />
                  </linearGradient>
                  
                  {/* Filtro 3D de Volumen Frontal */}
                  <filter id="volume3d" x="-20%" y="-20%" width="140%" height="140%">
                    {/* Altura / Bisel */}
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
                    
                    {/* Brillo especular (luz superior izquierda) */}
                    <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1.2" specularExponent="25" lighting-color="white" result="specular">
                      <fePointLight x="0" y="0" z="60" />
                    </feSpecularLighting>
                    <feComposite in="specular" in2="SourceAlpha" operator="in" result="highlight" />
                    
                    {/* Sombra interna (abajo a la derecha) */}
                    <feOffset dx="-1.5" dy="-1.5" in="SourceAlpha" result="offsetUp" />
                    <feComposite in="SourceAlpha" in2="offsetUp" operator="out" result="shadowMask" />
                    <feFlood floodColor="#000000" floodOpacity="0.7" result="shadowColor" />
                    <feComposite in="shadowColor" in2="shadowMask" operator="in" result="innerShadow" />
                    
                    {/* Composición final: Original + Brillo + Sombra Interna */}
                    <feComposite in="SourceGraphic" in2="highlight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litGraphic" />
                    <feComposite in="innerShadow" in2="litGraphic" operator="over" result="final3d" />
                  </filter>
                </defs>
                <g className="drop-shadow-[0_10px_20px_rgba(15,32,88,0.7)]">
                  <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="url(#gradBlueV13)" filter="url(#volume3d)" />
                </g>
                <g className="drop-shadow-[0_10px_20px_rgba(100,24,28,0.7)]">
                  <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="url(#gradRedV13)" filter="url(#volume3d)" />
                </g>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V13: Efecto 3D (Volumen)</h3>
            <p className="text-slate-400 leading-relaxed">
              El rayo salta de la pantalla. Aplicamos un complejo filtro matemático de luz (brillo especular y sombra interior) que moldea los vectores planos en un objeto 3D esculpido, dándole relieve hacia el frente.
            </p>
          </div>

          {/* Propuesta 14 */}
          <div className="bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                <defs>
                  {/* Reutilizamos los gradientes y el filtro 3D de la V13 */}
                  <linearGradient id="gradBlueV14" gradientUnits="userSpaceOnUse" x1="50" y1="60" x2="50" y2="5">
                    <stop offset="0%" stopColor="#0F2058" />
                    <stop offset="100%" stopColor="#1E357A" />
                  </linearGradient>
                  <linearGradient id="gradRedV14" gradientUnits="userSpaceOnUse" x1="50" y1="40" x2="50" y2="95">
                    <stop offset="0%" stopColor="#64181C" />
                    <stop offset="100%" stopColor="#862329" />
                  </linearGradient>
                </defs>
                <g className="drop-shadow-[0_12px_24px_rgba(15,32,88,0.7)]">
                  <path d="M 50 5 L 12.5 50 L 55 60 L 42.2 34.4 Z" fill="url(#gradBlueV14)" filter="url(#volume3d)" />
                </g>
                <g className="drop-shadow-[0_12px_24px_rgba(100,24,28,0.7)]">
                  <path d="M 50 95 L 87.5 50 L 45 40 L 57.8 65.6 Z" fill="url(#gradRedV14)" filter="url(#volume3d)" />
                </g>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V14: Monolito (Masa Recuperada)</h3>
            <p className="text-slate-400 leading-relaxed">
              Compensamos la ilusión de "adelgazamiento" aumentando la masa del diseño en un 25% (puntas ensanchadas a 25° y ancho total de 75). Además, cerramos la brecha por completo: ambas piezas se tocan matemáticamente, formando un bloque monolítico.
            </p>
          </div>

          {/* Propuesta 15 */}
          <div className="bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                <defs>
                  {/* Gradientes corporativos */}
                  <linearGradient id="gradBlueV15" gradientUnits="userSpaceOnUse" x1="50" y1="60" x2="50" y2="5">
                    <stop offset="0%" stopColor="#0F2058" />
                    <stop offset="100%" stopColor="#1E357A" />
                  </linearGradient>
                  <linearGradient id="gradRedV15" gradientUnits="userSpaceOnUse" x1="50" y1="40" x2="50" y2="95">
                    <stop offset="0%" stopColor="#64181C" />
                    <stop offset="100%" stopColor="#862329" />
                  </linearGradient>
                  
                  {/* Filtro 3D Redondeado (Cúpula) */}
                  <filter id="rounded3d" x="-20%" y="-20%" width="140%" height="140%">
                    {/* Mapa de altura suave y amplio para el efecto de curvatura */}
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur" />
                    
                    {/* Sombreado difuso para dar volumen al cuerpo (claroscuro suave) */}
                    <feDiffuseLighting in="blur" surfaceScale="6" diffuseConstant="1.3" lighting-color="white" result="diffuse">
                      <fePointLight x="0" y="0" z="50" />
                    </feDiffuseLighting>
                    <feComposite in="diffuse" in2="SourceAlpha" operator="in" result="diffuseMasked" />
                    
                    {/* Multiplicar el sombreado difuso por el color base */}
                    <feComposite in="diffuseMasked" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="base3d" />
                    
                    {/* Brillo especular (luz dura) para la cima de la cúpula */}
                    <feSpecularLighting in="blur" surfaceScale="6" specularConstant="1.1" specularExponent="18" lighting-color="white" result="specular">
                      <fePointLight x="20" y="20" z="40" />
                    </feSpecularLighting>
                    <feComposite in="specular" in2="SourceAlpha" operator="in" result="specularMasked" />
                    
                    {/* Añadir el brillo especular encima del cuerpo volumétrico */}
                    <feComposite in="specularMasked" in2="base3d" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="finalRounded" />
                  </filter>
                </defs>
                <g className="drop-shadow-[0_10px_20px_rgba(15,32,88,0.7)]">
                  {/* Geometría estricta de V12 para recuperar la alineación horizontal */}
                  <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="url(#gradBlueV15)" filter="url(#rounded3d)" />
                </g>
                <g className="drop-shadow-[0_10px_20px_rgba(100,24,28,0.7)]">
                  <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="url(#gradRedV15)" filter="url(#rounded3d)" />
                </g>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V15: Volumen Redondeado</h3>
            <p className="text-slate-400 leading-relaxed">
              Regresamos estrictamente a la geometría arquitectónica de la V12 para recuperar la alineación de las rodillas. Reemplazamos el "altiplano" biselado por un complejo shader 3D que curva las superficies suavemente hacia una cima central, logrando un relieve orgánico y táctil.
            </p>
          </div>

          {/* Propuesta 16 */}
          <div className="bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                <defs>
                  {/* Gradientes corporativos */}
                  <linearGradient id="gradBlueV16" gradientUnits="userSpaceOnUse" x1="50" y1="60" x2="50" y2="5">
                    <stop offset="0%" stopColor="#0F2058" />
                    <stop offset="100%" stopColor="#1E357A" />
                  </linearGradient>
                  <linearGradient id="gradRedV16" gradientUnits="userSpaceOnUse" x1="50" y1="40" x2="50" y2="95">
                    <stop offset="0%" stopColor="#64181C" />
                    <stop offset="100%" stopColor="#862329" />
                  </linearGradient>
                  
                  {/* Filtro 3D Redondeado (Cúpula Suave / Satinado) */}
                  <filter id="rounded3dSoft" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur" />
                    
                    {/* Sombreado difuso para el volumen general */}
                    <feDiffuseLighting in="blur" surfaceScale="6" diffuseConstant="1.2" lighting-color="white" result="diffuse">
                      <fePointLight x="0" y="0" z="50" />
                    </feDiffuseLighting>
                    <feComposite in="diffuse" in2="SourceAlpha" operator="in" result="diffuseMasked" />
                    
                    {/* Multiplicar sombreado por el color base */}
                    <feComposite in="diffuseMasked" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="base3d" />
                    
                    {/* Brillo especular MUY SUAVE para no llegar al blanco puro */}
                    <feSpecularLighting in="blur" surfaceScale="6" specularConstant="0.4" specularExponent="15" lighting-color="#e2e8f0" result="specular">
                      <fePointLight x="20" y="20" z="40" />
                    </feSpecularLighting>
                    <feComposite in="specular" in2="SourceAlpha" operator="in" result="specularMasked" />
                    
                    {/* Composición final con brillo sutil */}
                    <feComposite in="specularMasked" in2="base3d" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="finalRounded" />
                  </filter>
                </defs>
                <g className="drop-shadow-[0_10px_20px_rgba(15,32,88,0.7)]">
                  <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="url(#gradBlueV16)" filter="url(#rounded3dSoft)" />
                </g>
                <g className="drop-shadow-[0_10px_20px_rgba(100,24,28,0.7)]">
                  <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="url(#gradRedV16)" filter="url(#rounded3dSoft)" />
                </g>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V16: Volumen Satinado</h3>
            <p className="text-slate-400 leading-relaxed">
              La V15 perfeccionada. Ajustamos la física de la luz (reduciendo la constante especular y usando un tono gris azulado) para que el brillo en la cima no se queme hacia el blanco puro. El resultado es un acabado satinado elegante y muy premium.
            </p>
          </div>

          {/* Propuesta 17 */}
          <div className="bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                <defs>
                  {/* Gradientes originales vibrantes */}
                  <linearGradient id="gradBlueV17" gradientUnits="userSpaceOnUse" x1="50" y1="60" x2="50" y2="5">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="gradRedV17" gradientUnits="userSpaceOnUse" x1="50" y1="40" x2="50" y2="95">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#FB923C" />
                  </linearGradient>
                  
                  {/* Filtro 3D Redondeado (Cúpula Suave / Satinado) */}
                  <filter id="rounded3dSoftV17" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur" />
                    <feDiffuseLighting in="blur" surfaceScale="6" diffuseConstant="1.2" lighting-color="white" result="diffuse">
                      <fePointLight x="0" y="0" z="50" />
                    </feDiffuseLighting>
                    <feComposite in="diffuse" in2="SourceAlpha" operator="in" result="diffuseMasked" />
                    <feComposite in="diffuseMasked" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="base3d" />
                    <feSpecularLighting in="blur" surfaceScale="6" specularConstant="0.4" specularExponent="15" lighting-color="#e2e8f0" result="specular">
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
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V17: Satinado Original</h3>
            <p className="text-slate-400 leading-relaxed">
              Conservamos el modelado 3D perfecto de la V16 (volumen redondeado y textura satinada) pero regresamos a la paleta de colores vibrantes original (#3B82F6 y #F97316). El resultado es mucho más eléctrico, tecnológico y fresco.
            </p>
          </div>

          {/* Propuesta 18 */}
          <div className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xl transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-lg hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                {/* Geometría exacta de V11 sin filtros 3D, optimizada para fondo blanco */}
                <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="#3B82F6" className="drop-shadow-[0_8px_16px_rgba(59,130,246,0.3)]" />
                <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="#F97316" className="drop-shadow-[0_8px_16px_rgba(249,115,22,0.3)]" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-slate-800">V18: V11 (Fondo Blanco)</h3>
            <p className="text-slate-500 leading-relaxed">
              Rescatamos la estructura plana exacta de la V11 (el interbloqueo puro con puntas de 23° y colores vibrantes), pero la presentamos sobre un fondo blanco puro. Las sombras se ajustaron sutilmente hacia abajo para dar profundidad limpia sin ensuciar el lienzo claro.
            </p>
          </div>

          {/* Propuesta 19 */}
          <div className="bg-black border border-white/10 hover:border-white/20 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                {/* Geometría exacta de V11, optimizada para fondo negro con resplandor intenso */}
                <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="#3B82F6" className="drop-shadow-[0_0_24px_rgba(59,130,246,0.6)]" />
                <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="#F97316" className="drop-shadow-[0_0_24px_rgba(249,115,22,0.6)]" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V19: V11 (Fondo Negro)</h3>
            <p className="text-slate-400 leading-relaxed">
              La misma estructura pura de la V11 contrastada contra el negro absoluto. Aquí, las sombras proyectadas actúan como un resplandor (glow) de neón que interactúa orgánicamente con el fondo oscuro, resaltando el poder visual de la geometría plana.
            </p>
          </div>

          {/* Propuesta 20 */}
          <div className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xl transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-lg hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                {/* Silhouette test: Black on White, no shadows */}
                <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="#000000" />
                <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="#000000" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-slate-800">V20: Monocromo Positivo (Negro sobre Blanco)</h3>
            <p className="text-slate-500 leading-relaxed">
              La prueba de fuego de todo buen logotipo: funcionar a una sola tinta. Ambos elementos son negros puros sobre fondo blanco sin sombras. Aquí es donde el uso del espacio negativo (la brecha entre los rayos) brilla, definiendo perfectamente las dos partes.
            </p>
          </div>

          {/* Propuesta 21 */}
          <div className="bg-black border border-white/10 hover:border-white/20 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl hover:-translate-y-1">
            <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeLinejoin="miter">
                {/* Silhouette test: White on Black, no shadows */}
                <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="#FFFFFF" />
                <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="#FFFFFF" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">V21: Monocromo Negativo (Blanco sobre Negro)</h3>
            <p className="text-slate-400 leading-relaxed">
              La versión inversa a una tinta. Ambos elementos en blanco puro sobre negro absoluto. El alto contraste demuestra que el isotipo mantiene su fuerza geométrica y agresividad incluso cuando es estampado en un medio plano que no permite color.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
