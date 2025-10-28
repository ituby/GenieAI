"use client";

import React, { useEffect, useState } from "react";

interface Firefly {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  pulseDelay: number;
  pulseDuration: number;
  isBright?: boolean;
}

interface FireflyBackgroundProps {
  count?: number;
}

export const FireflyBackground: React.FC<FireflyBackgroundProps> = ({
  count = 60,
}) => {
  const [fireflies, setFireflies] = useState<Firefly[]>([]);

  useEffect(() => {
    // Initialize regular fireflies
    const regularCount = Math.floor(count * 0.85);
    const brightCount = count - regularCount;
    
    const regularFireflies = Array.from({ length: regularCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 0.5, // 1-1.5px - much smaller
      duration: 15 + Math.random() * 15,
      delay: Math.random() * 10,
      pulseDelay: Math.random() * 3,
      pulseDuration: 2 + Math.random() * 2,
      isBright: false,
    }));
    
    // Add bright fireflies - fewer, more glowy
    const brightFireflies = Array.from({ length: brightCount }, (_, i) => ({
      id: regularCount + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 1, // 1.5-2.5px - much smaller
      duration: 20 + Math.random() * 20, // slower movement
      delay: Math.random() * 15,
      pulseDelay: Math.random() * 2,
      pulseDuration: 3 + Math.random() * 3, // longer pulse
      isBright: true,
    }));

    setFireflies([...regularFireflies, ...brightFireflies]);
  }, [count]);

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          20% {
            transform: translate(60px, -50px);
          }
          40% {
            transform: translate(-45px, 40px);
          }
          60% {
            transform: translate(50px, -30px);
          }
          80% {
            transform: translate(-35px, 45px);
          }
        }
        
        @keyframes floatBright {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(80px, -70px);
          }
          50% {
            transform: translate(-60px, 55px);
          }
          75% {
            transform: translate(70px, -40px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .firefly {
          position: absolute;
          pointer-events: none;
          will-change: transform, opacity;
        }

        .firefly-core {
          position: absolute;
          border-radius: 50%;
          background: #FCD34D;
          will-change: transform, opacity;
        }

        .firefly-glow {
          position: absolute;
          border-radius: 50%;
          background: #FCD34D;
          filter: blur(3px);
          will-change: transform, opacity;
        }
      `}</style>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        {fireflies.map((firefly) => (
          <div
            key={firefly.id}
            className="firefly"
            style={{
              left: `${firefly.x}%`,
              top: `${firefly.y}%`,
              animationName: firefly.isBright ? 'floatBright' : 'float',
              animationDuration: `${firefly.duration}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${firefly.delay}s`,
            }}
          >
            {/* Glow */}
            <div
              className="firefly-glow"
              style={{
                width: `${firefly.size * (firefly.isBright ? 4 : 3)}px`,
                height: `${firefly.size * (firefly.isBright ? 4 : 3)}px`,
                left: `${-firefly.size * (firefly.isBright ? 1.5 : 1)}px`,
                top: `${-firefly.size * (firefly.isBright ? 1.5 : 1)}px`,
                opacity: firefly.isBright ? 0.7 : 0.3,
                animationName: 'pulse',
                animationDuration: `${firefly.pulseDuration}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${firefly.pulseDelay}s`,
                filter: `blur(${firefly.isBright ? 4 : 3}px)`,
              }}
            />
            {/* Core */}
            <div
              className="firefly-core"
              style={{
                width: `${firefly.size}px`,
                height: `${firefly.size}px`,
                boxShadow: `0 0 ${firefly.size * (firefly.isBright ? 5 : 3)}px ${firefly.size * (firefly.isBright ? 3 : 1.5)}px rgba(252, 211, 77, ${firefly.isBright ? 0.8 : 0.4})`,
                animationName: 'pulse',
                animationDuration: `${firefly.pulseDuration}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${firefly.pulseDelay}s`,
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
};

