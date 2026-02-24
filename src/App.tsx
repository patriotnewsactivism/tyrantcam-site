import React, { useState } from 'react';

type Tyrant = {
  id: number;
  name: string;
  title: string;
  crime: string;
  imageUrl: string;
};

const tyrants: Tyrant[] = [
  {
    id: 1,
    name: "General Malice",
    title: "Supreme Commander of Discomfort",
    crime: "Replaced all office chairs with wooden stools.",
    imageUrl: "https://via.placeholder.com/400x400/8a0000/ffffff?text=MALICE"
  },
  {
    id: 2,
    name: "Baron Von Bureaucrat",
    title: "Chief of Red Tape",
    crime: "Made breathing require a filled-out form in triplicate.",
    imageUrl: "https://via.placeholder.com/400x400/333333/ffffff?text=BUREAUCRAT"
  },
  {
    id: 3,
    name: "Empress EGO",
    title: "Queen of the Selfie",
    crime: "Banned mirrors for everyone but herself.",
    imageUrl: "https://via.placeholder.com/400x400/550000/ffffff?text=EGO"
  },
  {
    id: 4,
    name: "Lord Micro-Manager",
    title: "Duke of Details",
    crime: "Correction: It's 'Grand Duke'.",
    imageUrl: "https://via.placeholder.com/400x400/000000/ffffff?text=MICRO"
  },
    {
    id: 5,
    name: "Count Cancellation",
    title: "Vampire of Joy",
    crime: "Cancelled the company picnic due to 'potential fun'.",
    imageUrl: "https://via.placeholder.com/400x400/220000/ffffff?text=CANCEL"
  }
];

function TyrantCard({ tyrant }: { tyrant: Tyrant }) {
  return (
    <div className="bg-tyrant-gray border-2 border-tyrant-red rounded-sm p-4 hover:shadow-[0_0_20px_rgba(138,0,0,0.5)] transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center">
      <div className="relative w-full aspect-square mb-4 overflow-hidden border border-tyrant-red group">
        <img 
          src={tyrant.imageUrl} 
          alt={tyrant.name} 
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
        />
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-2">
            <h3 className="text-2xl font-bold text-white uppercase tracking-widest text-shadow-sm">{tyrant.name}</h3>
        </div>
      </div>
      
      <div className="text-center w-full">
        <p className="text-tyrant-red font-mono text-sm mb-2 uppercase tracking-wide border-b border-tyrant-red pb-1 inline-block">{tyrant.title}</p>
        <p className="text-gray-300 italic text-sm mt-2">"{tyrant.crime}"</p>
      </div>
      
      <button className="mt-4 w-full bg-tyrant-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-none uppercase tracking-widest text-xs transition-colors">
        SHAME!
      </button>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-tyrant-black text-white p-8">
      <header className="mb-12 text-center border-b-4 border-tyrant-red pb-8">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-600 to-tyrant-red uppercase tracking-tighter drop-shadow-lg mb-2">
          WALL OF SHAME
        </h1>
        <p className="text-xl md:text-2xl font-mono text-gray-400 uppercase tracking-[0.5em]">
          Know Your Tyrants
        </p>
      </header>

      <main className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tyrants.map((tyrant) => (
            <TyrantCard key={tyrant.id} tyrant={tyrant} />
          ))}
        </div>
      </main>

      <footer className="mt-20 text-center text-gray-600 text-sm font-mono">
        &copy; {new Date().getFullYear()} TYRANTCAM - EXPOSING THE TRUTH
      </footer>
    </div>
  );
}

export default App;
