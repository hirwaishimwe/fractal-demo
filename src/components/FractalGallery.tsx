import React, { useState } from 'react';
import TorusFractal from './TorusFractal';
import SierpinskiTetrahedron from './SierpinskiTetrahedron';
import MengerSponge from './MengerSponge';
import JuliaSet from './JuliaSet';
import FlowingNetworkFractal from './FlowingNetworkFractal';
import IOHKStyleFractal from './IOHKStyleFractal';
import WolframGameOfLife from './WolframGameOfLife';

type FractalType = 'torus' | 'tetrahedron' | 'menger' | 'julia' | 'network' | 'iohk' | 'wolfram';

export default function FractalGallery() {
  const [activeFractal, setActiveFractal] = useState<FractalType>('torus');

  const renderFractal = () => {
    switch (activeFractal) {
      case 'torus':
        return <TorusFractal />;
      case 'tetrahedron':
        return <SierpinskiTetrahedron />;
      case 'menger':
        return <MengerSponge />;
      case 'julia':
        return <JuliaSet />;
      case 'network':
        return <FlowingNetworkFractal />;
      case 'iohk':
        return <IOHKStyleFractal />;
      case 'wolfram':
        return <WolframGameOfLife />;
      default:
        return <TorusFractal />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-black/70 text-white flex flex-wrap justify-center gap-4">
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            activeFractal === 'torus' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => setActiveFractal('torus')}
        >
          Torus Fractal
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            activeFractal === 'tetrahedron' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => setActiveFractal('tetrahedron')}
        >
          Sierpinski Tetrahedron
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            activeFractal === 'menger' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => setActiveFractal('menger')}
        >
          Menger Sponge
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            activeFractal === 'julia' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => setActiveFractal('julia')}
        >
          Julia Set
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            activeFractal === 'network' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => setActiveFractal('network')}
        >
          Network Fractal
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            activeFractal === 'iohk' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => setActiveFractal('iohk')}
        >
          IOHK Style
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            activeFractal === 'wolfram' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => setActiveFractal('wolfram')}
        >
          Wolfram CA
        </button>
      </div>

      {/* Description */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-black/70 text-white">
        <h2 className="text-xl font-bold mb-2">
          {activeFractal === 'torus' && 'Torus Fractal'}
          {activeFractal === 'tetrahedron' && 'Sierpinski Tetrahedron'}
          {activeFractal === 'menger' && 'Menger Sponge'}
          {activeFractal === 'julia' && 'Julia Set'}
          {activeFractal === 'network' && 'Network Fractal'}
          {activeFractal === 'iohk' && 'IOHK-Style Flowing Lines'}
          {activeFractal === 'wolfram' && 'Wolfram Cellular Automaton'}
        </h2>
        <p>
          {activeFractal === 'torus' && 
            'A recursive structure of tori (donuts) that spawns smaller tori at key positions. Each depth level is represented by a different color.'}
          {activeFractal === 'tetrahedron' && 
            'A 3D version of the Sierpinski triangle, where each tetrahedron splits into four smaller tetrahedra at each vertex.'}
          {activeFractal === 'menger' && 
            'A 3D generalization of the Cantor set and Sierpinski carpet, removing cubes from the center of each face in each iteration.'}
          {activeFractal === 'julia' && 
            'Generated using a mathematical formula in the complex plane, where each pixel color is determined by how quickly the point escapes to infinity.'}
          {activeFractal === 'network' && 
            'A network of interconnected lines forming a simple recursive geometric pattern with flowing animations.'}
          {activeFractal === 'iohk' && 
            'Inspired by the IOHK Lace visualization, featuring curved, flowing lines that create an organic network pattern with glowing particles moving along the structure.'}
          {activeFractal === 'wolfram' && 
            'Based on the Rule 30 cellular automaton from Stephen Wolfram\'s "A New Kind of Science." Starting with a single cell, watch as the pattern grows and complex structures emerge from simple rules.'}
        </p>
      </div>

      {/* Fractal Visualization */}
      <div className="w-full h-full">
        {renderFractal()}
      </div>
    </div>
  );
}